"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Cloud, Sun, MapPin, Loader2, Clock } from "lucide-react"

interface WeatherData {
  temperature: number
  windspeed: number
  winddirection: number
  weathercode: number
  is_day: number
  time: string
}

export function WeatherWidget() {
  const [time, setTime] = useState(new Date())
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      if (data.current_weather) {
        setWeather(data.current_weather as WeatherData)
      }
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError("Không thể tải thời tiết")
      setLoading(false)
    }
  }

  const getLocation = () => {
    setLoading(true)
    setError(null)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude)
        },
        (err) => {
          console.error(err)
          setError("Cần quyền truy cập vị trí")
          setLoading(false)
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    } else {
      setError("Trình duyệt không hỗ trợ")
      setLoading(false)
    }
  }

  // Auto fetch location on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      getLocation()
    }, 0)
    return () => clearTimeout(timer)
  }, [])


  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("vi-VN", {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    return date.toLocaleDateString("vi-VN", options)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 md:gap-6 bg-[var(--bg-card)] border border-[var(--border-color)] px-4 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-3xl shadow-sm backdrop-blur-xl"
    >
      {/* Date & Time Section - Hidden on Mobile */}
      <div className="hidden sm:flex flex-col gap-0.5 border-r border-[var(--border-color)] pr-6">
        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
          <Clock className="w-3 h-3" />
          <span className="text-[9px] font-black uppercase tracking-widest leading-none">
            {formatDate(time)}
          </span>
        </div>
        <div className="text-2xl font-black tracking-tighter text-[var(--text-main)] tabular-nums leading-none mt-1">
          {formatTime(time)}
        </div>
      </div>

      {/* Weather Section */}
      <div className="flex items-center gap-3 md:gap-5">
        {loading ? (
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Đang tải...</span>
          </div>
        ) : weather ? (
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              {weather.temperature > 25 ? (
                <Sun className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
              ) : (
                <Cloud className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-black tracking-tighter leading-none text-[var(--text-main)]">{Math.round(weather.temperature)}°C</span>
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Hà Nội & lân cận</span>
            </div>
          </div>
        ) : (
          <div className="text-[9px] font-black uppercase tracking-widest text-rose-500 max-w-[80px] leading-tight">
            {error || "Lỗi tải"}
          </div>
        )}

        <button 
          onClick={getLocation}
          className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-[var(--bg-input)] hover:bg-blue-600 hover:text-white border border-[var(--border-color)] rounded-xl transition-all active:scale-90 group shadow-sm"
          title="Lấy vị trí hiện tại"
        >
          <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>
      </div>
    </motion.div>
  )
}
