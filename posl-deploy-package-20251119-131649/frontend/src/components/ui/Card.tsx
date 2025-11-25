import { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
}

const Card = ({ children, className, title, ...props }: CardProps) => {
  const cardClasses = clsx(
    'bg-white rounded-lg shadow-sm border border-gray-200',
    className
  )

  return (
    <div className={cardClasses} {...props}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className={title ? 'p-6' : 'p-6'}>
        {children}
      </div>
    </div>
  )
}

export default Card