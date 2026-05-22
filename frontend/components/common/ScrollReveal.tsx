"use client"

import React, { useEffect, useRef, useState } from "react"

interface ScrollRevealProps {
  children: React.ReactNode
  delay?: number // in ms
  duration?: number // in ms
  className?: string
  distance?: number // in px, translation distance
}

export default function ScrollReveal({
  children,
  delay = 0,
  duration = 600,
  className = "",
  distance = 12,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(element)
        }
      },
      {
        threshold: 0.05, // trigger when 5% is visible
        rootMargin: "0px 0px -50px 0px", // triggers slightly before entering viewport fully
      }
    )

    observer.observe(element)
    return () => {
      if (element) observer.unobserve(element)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "none" : `translateY(${distance}px)`,
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        transitionDelay: `${delay}ms`,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  )
}
