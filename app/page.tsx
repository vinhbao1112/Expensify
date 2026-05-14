"use client"

import { motion } from "framer-motion"
import { ArrowRight, BarChart3, Database, ShieldCheck, Zap } from "lucide-react"
import { useSession, signIn } from "next-auth/react"
import { Dashboard } from "@/components/Dashboard"

export default function Home() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (session) {
    return <Dashboard />
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  }

  return (
    <div className="relative isolate">
      {/* Background Orbs */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-blue-300 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
      </div>

      <div className="container mx-auto px-4 pt-20 pb-32">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-3xl mx-auto"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-primary/20 text-primary text-sm font-medium mb-6">
            <Zap className="w-4 h-4 fill-primary" />
            <span>Đã hỗ trợ đồng bộ Google Sheets</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Quản lý tài chính <br />
            <span className="bg-gradient-to-r from-primary via-blue-500 to-indigo-600 bg-clip-text text-transparent">
              Thông minh & Tự động
            </span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Theo dõi thu chi của bạn một cách dễ dàng. Dữ liệu được lưu trữ trực tiếp vào Google Sheets của riêng bạn, đảm bảo quyền riêng tư và khả năng truy cập mọi lúc mọi nơi.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => signIn("google")}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-xl shadow-primary/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 group"
            >
              Bắt đầu ngay
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 rounded-2xl glass font-semibold text-lg hover:bg-white/10 active:scale-95 transition-all border border-white/10">
              Tìm hiểu thêm
            </button>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              { icon: Database, title: "Google Sheets Backend", desc: "Tận dụng sức mạnh của bảng tính để lưu trữ và quản lý dữ liệu." },
              { icon: BarChart3, title: "Phân tích Trực quan", desc: "Biểu đồ sinh động giúp bạn hiểu rõ thói quen chi tiêu của mình." },
              { icon: ShieldCheck, title: "Bảo mật Tuyệt đối", desc: "Chỉ bạn mới có quyền truy cập vào dữ liệu tài chính của mình." }
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-3xl glass border border-white/5 hover:border-primary/20 transition-colors group">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
        <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-10 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
      </div>
    </div>
  )
}
