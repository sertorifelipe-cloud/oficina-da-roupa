import { forwardRef, TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        <label htmlFor={id} className="text-lg font-semibold text-gray-800">
          {label}
        </label>
        <textarea
          id={id}
          ref={ref}
          className={[
            'w-full min-h-[100px] p-4 rounded-xl border text-lg text-gray-900 bg-white shadow-sm transition-all resize-y',
            'focus:outline-none focus:ring-2 focus:ring-purple-900 focus:border-transparent',
            'placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-500',
            error ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400',
            className
          ].join(' ')}
          {...props}
        />
        {error && <p className="text-base text-red-600 font-medium">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
