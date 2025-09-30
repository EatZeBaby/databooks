import { motion } from 'framer-motion'
import Image from 'next/image'
import axelPic from '@/assets/images/Profile Picture Axel.jpg'

export default function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).map(s=>s[0]?.toUpperCase()).slice(0,2).join('') || 'DT'
  const isAxel = /axel/i.test(name) || /richier/i.test(name)
  return (
    <motion.div
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-semibold overflow-hidden"
    >
      {isAxel ? (
        <Image src={axelPic} alt={name} width={48} height={48} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </motion.div>
  )
}


