"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

export function ParallaxBackground() {
  const { scrollY } = useScroll()
  
  // Create different parallax movements for each orb
  const y1 = useTransform(scrollY, [0, 1000], [0, 200])
  const y2 = useTransform(scrollY, [0, 1000], [0, -150])
  const y3 = useTransform(scrollY, [0, 1000], [0, 100])
  
  const rotate1 = useTransform(scrollY, [0, 1000], [0, 45])
  const rotate2 = useTransform(scrollY, [0, 1000], [0, -30])

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="glass-grid" />
      
      <motion.div 
        style={{ y: y1, rotate: rotate1 }}
        className="mesh-orb w-[800px] h-[800px] bg-blue-500/30 -top-40 -left-40" 
      />
      
      <motion.div 
        style={{ y: y2, rotate: rotate2 }}
        className="mesh-orb w-[700px] h-[700px] bg-purple-500/30 top-1/2 -right-40 [animation-delay:2s]" 
      />
      
      <motion.div 
        style={{ y: y3 }}
        className="mesh-orb w-[600px] h-[600px] bg-emerald-500/20 bottom-0 left-1/4 [animation-delay:4s]" 
      />
    </div>
  )
}
