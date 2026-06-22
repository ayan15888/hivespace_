"use client";

import React, { useState, useRef, useEffect } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { MousePointer, Square, Circle, ArrowRight, Trash2, Type, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the colors based on the design system
const SHAPE_COLORS = [
  { name: "Coral", value: "#cc785c" },
  { name: "Ink", value: "#141413" },
  { name: "Teal", value: "#5db8a6" },
  { name: "Amber", value: "#e8a55a" },
  { name: "Green", value: "#5db872" },
];

interface Shape {
  id: string;
  type: "rectangle" | "oval" | "arrow";
  x: number;
  y: number;
  w: number; // For rectangle/oval this is width, for arrow this is endX
  h: number; // For rectangle/oval this is height, for arrow this is endY
  color: string;
  fill: string;
  text?: string;
}

function DrawingCanvasView({ node, updateAttributes }: any) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedTool, setSelectedTool] = useState<"select" | "rectangle" | "oval" | "arrow">("select");
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState("#cc785c"); // default Coral
  const [currentFillType, setCurrentFillType] = useState<"none" | "tint" | "solid">("tint");
  const [labelText, setLabelText] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [drawingStart, setDrawingStart] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  // Load shapes on mount / update from attributes
  useEffect(() => {
    try {
      const parsed = JSON.parse(node.attrs.diagramData || "[]");
      setShapes(parsed);
    } catch (e) {
      setShapes([]);
    }
  }, [node.attrs.diagramData]);

  const saveShapes = (newShapes: Shape[]) => {
    updateAttributes({
      diagramData: JSON.stringify(newShapes),
    });
  };

  // Convert current fill style based on selected stroke color
  const getFillColor = (color: string, fillType: "none" | "tint" | "solid") => {
    if (fillType === "none") return "none";
    if (fillType === "solid") return color;
    // Tint with opacity
    if (color.startsWith("#")) {
      // Simple hex to rgba
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.12)`;
    }
    return "rgba(204, 120, 92, 0.12)";
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (selectedTool === "select") {
      // Clicked on empty space: clear selection
      setSelectedShapeId(null);
      setLabelText("");
      return;
    }

    // Start drawing a new shape
    setIsDrawing(true);
    setDrawingStart({ x: mouseX, y: mouseY });

    const newShape: Shape = {
      id: Math.random().toString(36).substring(2, 9),
      type: selectedTool,
      x: mouseX,
      y: mouseY,
      w: selectedTool === "arrow" ? mouseX : 0,
      h: selectedTool === "arrow" ? mouseY : 0,
      color: currentColor,
      fill: selectedTool === "arrow" ? "none" : getFillColor(currentColor, currentFillType),
      text: "",
    };

    const updated = [...shapes, newShape];
    setShapes(updated);
    setSelectedShapeId(newShape.id);
    setLabelText("");
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDrawing && selectedShapeId) {
      const updated = shapes.map((s) => {
        if (s.id !== selectedShapeId) return s;
        if (s.type === "arrow") {
          return { ...s, w: mouseX, h: mouseY };
        } else {
          const width = mouseX - drawingStart.x;
          const height = mouseY - drawingStart.y;
          return {
            ...s,
            x: width < 0 ? mouseX : drawingStart.x,
            y: height < 0 ? mouseY : drawingStart.y,
            w: Math.abs(width),
            h: Math.abs(height),
          };
        }
      });
      setShapes(updated);
    } else if (isDragging && selectedShapeId) {
      const updated = shapes.map((s) => {
        if (s.id !== selectedShapeId) return s;
        if (s.type === "arrow") {
          const dx = mouseX - dragOffset.x - s.x;
          const dy = mouseY - dragOffset.y - s.y;
          return {
            ...s,
            x: mouseX - dragOffset.x,
            y: mouseY - dragOffset.y,
            w: s.w + dx,
            h: s.h + dy,
          };
        } else {
          return {
            ...s,
            x: mouseX - dragOffset.x,
            y: mouseY - dragOffset.y,
          };
        }
      });
      setShapes(updated);
    }
  };

  const handleSvgMouseUp = () => {
    if (isDrawing || isDragging) {
      setIsDrawing(false);
      setIsDragging(false);
      saveShapes(shapes);
    }
  };

  const handleShapeMouseDown = (e: React.MouseEvent, shapeId: string) => {
    if (selectedTool !== "select" || !svgRef.current) return;
    e.stopPropagation();
    setSelectedShapeId(shapeId);

    const shape = shapes.find((s) => s.id === shapeId);
    if (shape) {
      setLabelText(shape.text || "");
      setCurrentColor(shape.color);
    }

    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setIsDragging(true);
    setDragOffset({
      x: mouseX - shape!.x,
      y: mouseY - shape!.y,
    });
  };

  const deleteSelectedShape = () => {
    if (!selectedShapeId) return;
    const updated = shapes.filter((s) => s.id !== selectedShapeId);
    setShapes(updated);
    setSelectedShapeId(null);
    setLabelText("");
    saveShapes(updated);
  };

  const updateLabel = (text: string) => {
    setLabelText(text);
    if (!selectedShapeId) return;
    const updated = shapes.map((s) => {
      if (s.id === selectedShapeId) {
        return { ...s, text };
      }
      return s;
    });
    setShapes(updated);
    saveShapes(updated);
  };

  const updateColor = (color: string) => {
    setCurrentColor(color);
    if (!selectedShapeId) return;
    const updated = shapes.map((s) => {
      if (s.id === selectedShapeId) {
        return {
          ...s,
          color,
          fill: s.type === "arrow" ? "none" : getFillColor(color, currentFillType),
        };
      }
      return s;
    });
    setShapes(updated);
    saveShapes(updated);
  };

  const updateFillType = (fillType: "none" | "tint" | "solid") => {
    setCurrentFillType(fillType);
    if (!selectedShapeId) return;
    const updated = shapes.map((s) => {
      if (s.id === selectedShapeId && s.type !== "arrow") {
        return {
          ...s,
          fill: getFillColor(s.color, fillType),
        };
      }
      return s;
    });
    setShapes(updated);
    saveShapes(updated);
  };

  const clearCanvas = () => {
    if (window.confirm("Clear entire diagram canvas?")) {
      setShapes([]);
      setSelectedShapeId(null);
      setLabelText("");
      saveShapes([]);
    }
  };

  return (
    <NodeViewWrapper className="my-6">
      <div 
        className="flex flex-col rounded-xl border border-[#e6dfd8] bg-[#efe9de]/30 overflow-hidden shadow-sm"
        contentEditable={false}
      >
        {/* Drawing Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e6dfd8] bg-[#faf9f5] px-4 py-2 text-[#141413] select-none">
          {/* Tools */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              active={selectedTool === "select"}
              onClick={() => setSelectedTool("select")}
              icon={MousePointer}
              title="Select / Move"
            />
            <div className="h-4 w-px bg-[#e6dfd8] mx-1" />
            <ToolbarButton
              active={selectedTool === "rectangle"}
              onClick={() => setSelectedTool("rectangle")}
              icon={Square}
              title="Rectangle"
            />
            <ToolbarButton
              active={selectedTool === "oval"}
              onClick={() => setSelectedTool("oval")}
              icon={Circle}
              title="Oval / Circle"
            />
            <ToolbarButton
              active={selectedTool === "arrow"}
              onClick={() => setSelectedTool("arrow")}
              icon={ArrowRight}
              title="Arrow"
            />
          </div>

          {/* Properties (Context-sensitive) */}
          <div className="flex items-center gap-3">
            {/* Color Swatches */}
            <div className="flex items-center gap-1.5">
              {SHAPE_COLORS.map((col) => (
                <button
                  key={col.value}
                  type="button"
                  onClick={() => updateColor(col.value)}
                  className={cn(
                    "h-5.5 w-5.5 rounded-full border transition-all hover:scale-110 cursor-pointer",
                    currentColor === col.value ? "border-[#cc785c] ring-2 ring-[#cc785c]/25 scale-105" : "border-zinc-300"
                  )}
                  style={{ backgroundColor: col.value }}
                  title={col.name}
                />
              ))}
            </div>

            {/* Fill Mode for non-arrows */}
            {selectedTool !== "arrow" && (!selectedShapeId || shapes.find(s => s.id === selectedShapeId)?.type !== "arrow") && (
              <div className="flex rounded-md border border-[#e6dfd8] bg-[#faf9f5] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => updateFillType("none")}
                  className={cn("px-2 py-0.5 rounded cursor-pointer transition-colors", currentFillType === "none" ? "bg-[#cc785c] text-white" : "text-[#6c6a64] hover:text-[#141413]")}
                >
                  Outline
                </button>
                <button
                  type="button"
                  onClick={() => updateFillType("tint")}
                  className={cn("px-2 py-0.5 rounded cursor-pointer transition-colors", currentFillType === "tint" ? "bg-[#cc785c] text-white" : "text-[#6c6a64] hover:text-[#141413]")}
                >
                  Tint
                </button>
                <button
                  type="button"
                  onClick={() => updateFillType("solid")}
                  className={cn("px-2 py-0.5 rounded cursor-pointer transition-colors", currentFillType === "solid" ? "bg-[#cc785c] text-white" : "text-[#6c6a64] hover:text-[#141413]")}
                >
                  Solid
                </button>
              </div>
            )}

            {/* Label input if a shape is selected */}
            {selectedShapeId && (
              <div className="flex items-center gap-1.5 border-l border-[#e6dfd8] pl-3">
                <Type className="h-3.5 w-3.5 text-[#6c6a64]" />
                <input
                  type="text"
                  placeholder="Label shape..."
                  value={labelText}
                  onChange={(e) => updateLabel(e.target.value)}
                  className="h-7 w-28 rounded border border-[#e6dfd8] bg-white px-2 py-1 text-xs text-[#141413] outline-none focus:border-[#cc785c]"
                />
              </div>
            )}
          </div>

          {/* Delete & Clear */}
          <div className="flex items-center gap-1.5">
            {selectedShapeId && (
              <button
                type="button"
                onClick={deleteSelectedShape}
                className="flex h-7.5 w-7.5 items-center justify-center rounded text-red-500 hover:bg-red-500/10 cursor-pointer"
                title="Delete Selected Shape"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={clearCanvas}
              className="flex h-7.5 w-7.5 items-center justify-center rounded text-[#6c6a64] hover:bg-zinc-200/50 cursor-pointer"
              title="Clear Canvas"
            >
              <Eraser className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* SVG Drawing Canvas Area */}
        <div className="relative bg-white select-none overflow-hidden h-[350px]">
          {/* Subtle grid pattern background */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#141413 1px, transparent 0)",
              backgroundSize: "20px 20px"
            }}
          />

          <svg
            ref={svgRef}
            className="w-full h-full"
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            style={{
              cursor: selectedTool === "select" ? "default" : "crosshair",
            }}
          >
            {shapes.map((shape) => {
              const isSelected = shape.id === selectedShapeId;
              const strokeColor = shape.color || "#cc785c";
              const fillColor = shape.fill || "none";
              
              const isPointerSelect = selectedTool === "select";
              const style = {
                pointerEvents: isPointerSelect ? ("auto" as const) : ("none" as const),
                cursor: isPointerSelect ? "move" : "crosshair",
              };

              const onMouseDown = (e: React.MouseEvent) => handleShapeMouseDown(e, shape.id);

              if (shape.type === "rectangle") {
                return (
                  <g key={shape.id} onMouseDown={onMouseDown}>
                    <rect
                      x={shape.x}
                      y={shape.y}
                      width={shape.w}
                      height={shape.h}
                      stroke={strokeColor}
                      fill={fillColor}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray={isSelected ? "4 4" : undefined}
                      style={style}
                      rx={6}
                    />
                    {shape.text && (
                      <text
                        x={shape.x + shape.w / 2}
                        y={shape.y + shape.h / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#141413"
                        style={{ pointerEvents: "none" }}
                        className="select-none font-sans text-xs font-semibold"
                      >
                        {shape.text}
                      </text>
                    )}
                  </g>
                );
              }

              if (shape.type === "oval") {
                const rx = shape.w / 2;
                const ry = shape.h / 2;
                const cx = shape.x + rx;
                const cy = shape.y + ry;
                return (
                  <g key={shape.id} onMouseDown={onMouseDown}>
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={Math.abs(rx)}
                      ry={Math.abs(ry)}
                      stroke={strokeColor}
                      fill={fillColor}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray={isSelected ? "4 4" : undefined}
                      style={style}
                    />
                    {shape.text && (
                      <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#141413"
                        style={{ pointerEvents: "none" }}
                        className="select-none font-sans text-xs font-semibold"
                      >
                        {shape.text}
                      </text>
                    )}
                  </g>
                );
              }

              if (shape.type === "arrow") {
                const startX = shape.x;
                const startY = shape.y;
                const endX = shape.w;
                const endY = shape.h;

                const dx = endX - startX;
                const dy = endY - startY;
                const angle = Math.atan2(dy, dx);
                const L = 12; // arrowhead size
                const arrowAngle = Math.PI / 6; // 30 degrees
                const x3 = endX - L * Math.cos(angle - arrowAngle);
                const y3 = endY - L * Math.sin(angle - arrowAngle);
                const x4 = endX - L * Math.cos(angle + arrowAngle);
                const y4 = endY - L * Math.sin(angle + arrowAngle);

                // Calculate center for text label position
                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2 - 10;

                return (
                  <g key={shape.id} onMouseDown={onMouseDown}>
                    {/* Invisible thicker line for easier clicking selection */}
                    <line
                      x1={startX}
                      y1={startY}
                      x2={endX}
                      y2={endY}
                      stroke="transparent"
                      strokeWidth={15}
                      style={style}
                    />
                    <line
                      x1={startX}
                      y1={startY}
                      x2={endX}
                      y2={endY}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 4.5 : 2.5}
                      strokeDasharray={isSelected ? "4 4" : undefined}
                      style={style}
                    />
                    <polygon
                      points={`${endX},${endY} ${x3},${y3} ${x4},${y4}`}
                      fill={strokeColor}
                      style={{ pointerEvents: "none" }}
                    />
                    {shape.text && (
                      <text
                        x={midX}
                        y={midY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#141413"
                        style={{ pointerEvents: "none" }}
                        className="select-none font-sans text-[10px] font-semibold"
                      >
                        {shape.text}
                      </text>
                    )}
                  </g>
                );
              }

              return null;
            })}
          </svg>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

function ToolbarButton({
  active,
  onClick,
  icon: Icon,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7.5 w-8 items-center justify-center rounded transition-all cursor-pointer",
        active ? "bg-[#cc785c] text-white shadow shadow-[#cc785c]/30" : "text-[#6c6a64] hover:bg-zinc-200/50 hover:text-[#141413]"
      )}
      title={title}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

export const HivespaceDrawing = Node.create({
  name: "hivespaceDrawing",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      diagramData: {
        default: "[]",
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-hivespace-drawing]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-hivespace-drawing": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawingCanvasView);
  },
});
