"use client"

import React, { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"

interface WebGPUVisualizerProps {
  className?: string
  intensity?: number
  speed?: number
  showControls?: boolean
}

export default function WebGPUVisualizer({
  className = "",
  intensity: initialIntensity = 1.0,
  speed: initialSpeed = 1.0,
  showControls = false,
}: WebGPUVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { resolvedTheme } = useTheme()
  const [engine, setEngine] = useState<"webgpu" | "canvas2d" | "none">("none")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Real-time customizer controls
  const [intensity, setIntensity] = useState(initialIntensity)
  const [speed, setSpeed] = useState(initialSpeed)
  const [particleCount, setParticleCount] = useState(120)

  // Shared state for mouse tracking
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, active: false })

  // Handle resizing
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Mouse listeners
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * window.devicePixelRatio
      const y = (e.clientY - rect.top) * window.devicePixelRatio
      mouseRef.current.targetX = x
      mouseRef.current.targetY = y
      mouseRef.current.active = true
    }

    const handleMouseLeave = () => {
      mouseRef.current.active = false
    }

    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  // WebGPU / Canvas2D Core Runner Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let animationFrameId: number
    let isDestroyed = false

    // State variables for engine
    let device: any = null
    let pipeline: any = null
    let uniformBuffer: any = null
    let bindGroup: any = null
    let context: any = null

    // Theme mapping: 0 = light, 1 = dark, 2 = dark-blue, 3 = claude
    const getThemeCode = (t: string | undefined) => {
      if (t === "dark") return 1.0
      if (t === "dark-blue") return 2.0
      if (t === "claude") return 3.0
      return 0.0 // light
    }

    // Attempt WebGPU Initialisation
    const initWebGPU = async () => {
      if (!(navigator as any).gpu) {
        throw new Error("WebGPU is not supported in this browser.")
      }

      const adapter = await (navigator as any).gpu.requestAdapter()
      if (!adapter) {
        throw new Error("No WebGPU adapter found.")
      }

      device = await adapter.requestDevice()
      context = canvas.getContext("webgpu") as any
      if (!context) {
        throw new Error("Could not acquire WebGPU context.")
      }

      const format = (navigator as any).gpu.getPreferredCanvasFormat()
      context.configure({
        device,
        format,
        alphaMode: "opaque",
      })

      // WGSL Shaders
      const shaderModule = device.createShaderModule({
        label: "Fluid Noise Shader",
        code: `
          struct VertexOutput {
            @builtin(position) position : vec4f,
            @location(0) uv : vec2f,
          };

          @vertex
          fn vs_main(@builtin(vertex_index) vertex_index : u32) -> VertexOutput {
            var pos = array<vec2f, 4>(
              vec2f(-1.0, -1.0),
              vec2f( 1.0, -1.0),
              vec2f(-1.0,  1.0),
              vec2f( 1.0,  1.0)
            );
            var uv = array<vec2f, 4>(
              vec2f(0.0, 1.0),
              vec2f(1.0, 1.0),
              vec2f(0.0, 0.0),
              vec2f(1.0, 0.0)
            );
            var out : VertexOutput;
            out.position = vec4f(pos[vertex_index], 0.0, 1.0);
            out.uv = uv[vertex_index];
            return out;
          }

          struct Uniforms {
            time : f32,
            resX : f32,
            resY : f32,
            mouseX : f32,
            mouseY : f32,
            theme : f32,
            intensity : f32,
            speed : f32,
          };

          @group(0) @binding(0) var<uniform> u : Uniforms;

          fn hash(p : vec2f) -> f32 {
            return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453123);
          }

          fn noise(p : vec2f) -> f32 {
            let i = floor(p);
            let f = fract(p);
            let u = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
              mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
              u.y
            );
          }

          fn fbm(p : vec2f) -> f32 {
            var value : f32 = 0.0;
            var amplitude : f32 = 0.5;
            var frequency : f32 = 1.0;
            for (var i = 0; i < 4; i = i + 1) {
              value = value + amplitude * noise(p * frequency);
              frequency = frequency * 2.0;
              amplitude = amplitude * 0.5;
            }
            return value;
          }

          @fragment
          fn fs_main(@location(0) uv : vec2f) -> @location(0) vec4f {
            let resolution = vec2f(u.resX, u.resY);
            let time = u.time * u.speed * 0.35;
            let mouse = vec2f(u.mouseX, u.mouseY);
            let theme = u.theme;
            let intens = u.intensity;

            var p = uv * 2.0 - 1.0;
            p.x = p.x * (resolution.x / resolution.y);

            // Flow deformation
            var q = vec2f(0.0);
            q.x = fbm(p + vec2f(0.0, 0.0));
            q.y = fbm(p + vec2f(1.0, 1.0));

            var r = vec2f(0.0);
            r.x = fbm(p + 1.0 * q + vec2f(1.7, 9.2) + 0.15 * time);
            r.y = fbm(p + 1.0 * q + vec2f(8.3, 2.8) + 0.12 * time);

            // Mouse interaction
            let distToMouse = distance(uv * resolution, mouse);
            var mouseEffect = 0.0;
            if (distToMouse < 300.0) {
              mouseEffect = (1.0 - distToMouse / 300.0) * intens * 1.5;
            }

            let f = fbm(p + r * (1.2 + mouseEffect));

            var col = vec3f(0.0);

            if (theme < 0.5) {
              // Light theme - Warm bone (#F7F6F3) and spot pastels
              let cBg = vec3f(0.97, 0.96, 0.95);
              let cAcc1 = vec3f(0.88, 0.93, 0.98); // Pale Blue
              let cAcc2 = vec3f(0.93, 0.95, 0.92); // Pale Green
              let cText = vec3f(0.47, 0.44, 0.40); // Soft charcoal
              
              col = mix(cBg, cAcc1, f);
              col = mix(col, cAcc2, r.x * 0.3);
              col = mix(col, cText, max(0.0, f - 0.6) * 0.15);
            } else if (theme < 1.5) {
              // Dark theme - Near black (#0E0E10) and glowing violet
              let cBg = vec3f(0.055, 0.055, 0.063);
              let cViolet = vec3f(0.49, 0.36, 0.99); // #7C5CFC
              let cCoral = vec3f(0.98, 0.36, 0.31);
              
              col = mix(cBg, cViolet * 0.15, f);
              col = mix(col, cViolet * 0.45, r.y * 0.5);
              col = mix(col, cCoral, clamp(q.x - 0.72, 0.0, 1.0) * 0.08);
            } else if (theme < 2.5) {
              // Dark-Blue theme - Deep blue (#090D16) and cyan/indigo
              let cBg = vec3f(0.035, 0.05, 0.086);
              let cIndigo = vec3f(0.31, 0.27, 0.9);
              let cCyan = vec3f(0.05, 0.65, 0.91);
              
              col = mix(cBg, cIndigo * 0.22, f);
              col = mix(col, cCyan * 0.38, r.x * 0.45);
              col = mix(col, vec3f(1.0), clamp(f - 0.68, 0.0, 1.0) * 0.06);
            } else {
              // Claude (dark terracotta) theme - charcoal (#171614) and warm coral #e07a5f
              let cBg = vec3f(0.09, 0.086, 0.078);
              let cCharcoal = vec3f(0.07, 0.066, 0.062);
              let cCoral = vec3f(0.878, 0.478, 0.373); // #e07a5f
              let cAccent = vec3f(0.651, 0.623, 0.58);
              
              col = mix(cBg, cCharcoal, f * 0.5);
              col = mix(col, cCoral * 0.35, r.y * 0.4);
              col = mix(col, cAccent * 0.3, max(0.0, q.x - 0.65) * 0.2);
            }

            // Vignette
            let vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
            let vig = clamp(pow(16.0 * vignette, 0.2), 0.0, 1.0);

            return vec4f(col * vig, 1.0);
          }
        `,
      })

      // Pipeline creation
      pipeline = device.createRenderPipeline({
        label: "Visualizer Render Pipeline",
        layout: "auto",
        vertex: {
          module: shaderModule,
          entryPoint: "vs_main",
        },
        fragment: {
          module: shaderModule,
          entryPoint: "fs_main",
          targets: [{ format }],
        },
        primitive: {
          topology: "triangle-strip",
        },
      })

      // Uniform buffer (sizeof: 8 floats * 4 bytes = 32 bytes)
      uniformBuffer = device.createBuffer({
        size: 32,
        usage: 0x0040 | 0x0008, // GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      })

      bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: uniformBuffer },
          },
        ],
      })

      setEngine("webgpu")
    }

    // WebGPU Render Loop
    let startTime = performance.now()
    const renderWebGPU = () => {
      if (isDestroyed || !device || !context || !pipeline || !uniformBuffer || !bindGroup) return

      const now = performance.now()
      const time = (now - startTime) / 1000

      // Smooth mouse tracking
      const mouse = mouseRef.current
      mouse.x += (mouse.targetX - mouse.x) * 0.08
      mouse.y += (mouse.targetY - mouse.y) * 0.08

      // Write uniforms
      const uniformData = new Float32Array([
        time,
        canvas.width,
        canvas.height,
        mouse.x,
        mouse.y,
        getThemeCode(resolvedTheme),
        intensity,
        speed,
      ])
      device.queue.writeBuffer(uniformBuffer, 0, uniformData)

      const commandEncoder = device.createCommandEncoder()
      const textureView = context.getCurrentTexture().createView()

      const renderPassDescriptor: any = {
        colorAttachments: [
          {
            view: textureView,
            clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      }

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
      passEncoder.setPipeline(pipeline)
      passEncoder.setBindGroup(0, bindGroup)
      passEncoder.draw(4)
      passEncoder.end()

      device.queue.submit([commandEncoder.finish()])

      animationFrameId = requestAnimationFrame(renderWebGPU)
    }

    // --- CANVAS 2D FALLBACK ENGINE ---
    // A stunning agent swarm flow-field constellation network
    interface SwarmAgent {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      opacity: number
      hue: number
      pulse: number
      pulseDir: number
    }

    let agents: SwarmAgent[] = []
    const initCanvas2D = () => {
      agents = []
      for (let i = 0; i < particleCount; i++) {
        agents.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          radius: Math.random() * 2 + 1,
          opacity: Math.random() * 0.4 + 0.2,
          hue: Math.random() * 30 - 15, // accent color offset
          pulse: Math.random(),
          pulseDir: Math.random() > 0.5 ? 0.02 : -0.02,
        })
      }
      setEngine("canvas2d")
    }

    const renderCanvas2D = () => {
      if (isDestroyed) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Smooth mouse
      const mouse = mouseRef.current
      mouse.x += (mouse.targetX - mouse.x) * 0.08
      mouse.y += (mouse.targetY - mouse.y) * 0.08

      // Determine colors based on current theme
      let bgCol = "#FBFBFA"
      let strokeCol = "rgba(17,17,17,0.06)"
      let agentBaseCol = "rgba(71,85,105,0.7)"
      let connectionCol = "rgba(17,17,17,0.03)"
      let pulseCol = "rgba(95,58,221,0.2)"

      if (resolvedTheme === "dark") {
        bgCol = "#0E0E10"
        strokeCol = "rgba(229,225,228,0.05)"
        agentBaseCol = "rgba(124,92,252,0.8)"
        connectionCol = "rgba(124,92,252,0.04)"
        pulseCol = "rgba(124,92,252,0.15)"
      } else if (resolvedTheme === "dark-blue") {
        bgCol = "#090D16"
        strokeCol = "rgba(14,165,233,0.05)"
        agentBaseCol = "rgba(14,165,233,0.8)"
        connectionCol = "rgba(14,165,233,0.04)"
        pulseCol = "rgba(79,70,229,0.15)"
      } else if (resolvedTheme === "claude") {
        bgCol = "#171614"
        strokeCol = "rgba(224,122,95,0.08)"
        agentBaseCol = "rgba(224,122,95,0.75)"
        connectionCol = "rgba(224,122,95,0.05)"
        pulseCol = "rgba(224,122,95,0.2)"
      }

      ctx.fillStyle = bgCol
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Grid backdrop (The digital architecture grid)
      ctx.strokeStyle = strokeCol
      ctx.lineWidth = 1
      const gridSize = 40
      ctx.beginPath()
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
      }
      ctx.stroke()

      // Update and draw agents
      const connectDist = 120
      const activeSpeed = speed * 0.8

      agents.forEach((agent, i) => {
        // Flow field calculation using simple wave logic
        const timeFactor = Date.now() * 0.0003 * speed
        const angle =
          Math.sin(agent.x * 0.003 + timeFactor) * Math.cos(agent.y * 0.003 + timeFactor) * Math.PI * 2

        agent.vx += Math.cos(angle) * 0.05 * activeSpeed
        agent.vy += Math.sin(angle) * 0.05 * activeSpeed

        // Mouse repulsion
        if (mouse.active) {
          const dx = agent.x - mouse.x
          const dy = agent.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 200) {
            const force = (1 - dist / 200) * 0.6 * intensity
            agent.vx += (dx / dist) * force
            agent.vy += (dy / dist) * force
          }
        }

        // Limit velocity
        const maxV = 2.0
        const currentV = Math.sqrt(agent.vx * agent.vx + agent.vy * agent.vy)
        if (currentV > maxV) {
          agent.vx = (agent.vx / currentV) * maxV
          agent.vy = (agent.vy / currentV) * maxV
        }

        agent.x += agent.vx
        agent.y += agent.vy

        // Wrap boundaries
        if (agent.x < 0) agent.x = canvas.width
        if (agent.x > canvas.width) agent.x = 0
        if (agent.y < 0) agent.y = canvas.height
        if (agent.y > canvas.height) agent.y = 0

        // Pulse logic
        agent.pulse += agent.pulseDir
        if (agent.pulse > 1.0 || agent.pulse < 0.0) {
          agent.pulseDir = -agent.pulseDir
        }

        // Draw connections (constellation net)
        for (let j = i + 1; j < agents.length; j++) {
          const other = agents[j]
          const dx = agent.x - other.x
          const dy = agent.y - other.y
          const d = Math.sqrt(dx * dx + dy * dy)

          if (d < connectDist) {
            ctx.beginPath()
            ctx.moveTo(agent.x, agent.y)
            ctx.lineTo(other.x, other.y)
            const alpha = (1 - d / connectDist) * 0.2 * agent.opacity
            ctx.strokeStyle = connectionCol.replace(/0\.\d+\)$/, `${alpha.toFixed(3)})`)
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }

        // Draw agent center
        ctx.beginPath()
        ctx.arc(agent.x, agent.y, agent.radius, 0, Math.PI * 2)
        ctx.fillStyle = agentBaseCol.replace(/0\.\d+\)$/, `${(agent.opacity * (0.8 + agent.pulse * 0.2)).toFixed(3)})`)
        ctx.fill()

        // Highlight ring on mouse hover
        if (mouse.active) {
          const dx = agent.x - mouse.x
          const dy = agent.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx.beginPath()
            ctx.arc(agent.x, agent.y, agent.radius + 3 + agent.pulse * 2, 0, Math.PI * 2)
            ctx.strokeStyle = pulseCol
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      })

      // Mouse interactive spot
      if (mouse.active) {
        ctx.beginPath()
        ctx.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = agentBaseCol
        ctx.fill()

        ctx.beginPath()
        ctx.arc(mouse.x, mouse.y, 40 + Math.sin(Date.now() * 0.005) * 5, 0, Math.PI * 2)
        ctx.strokeStyle = pulseCol
        ctx.lineWidth = 0.75
        ctx.stroke()
      }

      animationFrameId = requestAnimationFrame(renderCanvas2D)
    }

    // Main execution selector
    const run = async () => {
      try {
        await initWebGPU()
        renderWebGPU()
      } catch (err: any) {
        console.warn("WebGPU initialization failed, falling back to Canvas 2D:", err.message)
        setErrorMsg(err.message)
        initCanvas2D()
        renderCanvas2D()
      }
    }

    run()

    return () => {
      isDestroyed = true
      cancelAnimationFrame(animationFrameId)
      if (device) device.destroy()
    }
  }, [resolvedTheme, intensity, speed, particleCount])

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Dynamic Status / Badge overlay */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 pointer-events-none select-none">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 text-[9px] font-mono tracking-wider uppercase text-muted-foreground">
          <span className={`inline-block size-1.5 rounded-full ${engine === "webgpu" ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
          Render: {engine.toUpperCase()}
        </span>
        {engine === "webgpu" && (
          <span className="px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-[9px] font-mono tracking-wider uppercase text-primary">
            WGSL Compute Shader Active
          </span>
        )}
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Real-time Customizer panel (Interactive playground) */}
      {showControls && (
        <div className="absolute bottom-4 right-4 z-20 w-72 rounded-lg border border-border/80 bg-background/90 p-4 shadow-sm backdrop-blur-md select-none transition-all">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">GPU Simulation Controller</span>
            <span className="text-[9px] font-mono rounded bg-muted px-1 py-0.5 text-foreground">{engine.toUpperCase()}</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-[9px] font-mono">
                <span>Field Intensity</span>
                <span className="text-muted-foreground">{intensity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-[9px] font-mono">
                <span>Sim Flow Speed</span>
                <span className="text-muted-foreground">{speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.5"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {engine === "canvas2d" && (
              <div>
                <div className="mb-1 flex justify-between text-[9px] font-mono">
                  <span>Particle Swarm Density</span>
                  <span className="text-muted-foreground">{particleCount} units</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="250"
                  step="10"
                  value={particleCount}
                  onChange={(e) => setParticleCount(parseInt(e.target.value))}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            )}
          </div>

          <div className="mt-3 border-t border-border/40 pt-2 text-[8px] font-mono text-muted-foreground leading-relaxed">
            {engine === "webgpu"
              ? "Running mathematical simplex field + fBm calculations inside native WebGPU pipelines directly on your hardware's shader units."
              : "WebGPU unavailable. Running smooth 2D noise flow field particle simulations in dynamic canvas rasterizer."}
          </div>
        </div>
      )}
    </div>
  )
}
