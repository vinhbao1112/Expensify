"use client"

import { useState, useEffect } from "react"
import { Download, Share } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if it's iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsVisible(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    // On iOS, we can show the "manual" instructions if not in standalone
    if (isIOSDevice && !window.matchMedia("(display-mode: standalone)").matches) {
      setIsVisible(true)
    }

    // Hide if already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsVisible(false)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      alert("Để cài đặt: Nhấn vào biểu tượng 'Chia sẻ' (Share) bên dưới và chọn 'Thêm vào MH chính' (Add to Home Screen).")
      return
    }

    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === "accepted") {
      setDeferredPrompt(null)
      setIsVisible(false)
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            boxShadow: [
              "0 0 0 0px rgba(37, 99, 235, 0)",
              "0 0 0 10px rgba(37, 99, 235, 0.1)",
              "0 0 0 0px rgba(37, 99, 235, 0)"
            ]
          }}
          transition={{
            boxShadow: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={handleInstallClick}
          className="group relative flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white border border-blue-500 shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all duration-300"
          title={isIOS ? "Cách cài đặt trên iOS" : "Cài đặt ứng dụng"}
        >
          {isIOS ? <Share className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          <span className="text-[10px] font-black uppercase tracking-wider">
            {isIOS ? "Cài đặt" : "Cài đặt App"}
          </span>

          {/* Badge */}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white dark:border-zinc-900 rounded-full" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
