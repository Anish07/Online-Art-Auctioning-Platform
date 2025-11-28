import React from 'react'

export default function Button({ children, onClick, className }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded ${className || 'bg-primary text-white'}`}>
      {children}
    </button>
  )
}