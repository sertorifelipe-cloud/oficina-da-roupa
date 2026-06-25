import { forwardRef, SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        <label htmlFor={id} className="text-lg font-semibold text-gray-800">
          {label}
        </label>
        <select
          id={id}
          ref={ref}
          className={[
            'w-full min-h-[52px] h-14 px-4 rounded-xl border text-lg text-gray-900 bg-white shadow-sm transition-all appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-purple-900 focus:border-transparent',
            'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',
            error ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400',
            className
          ].join(' ')}
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            backgroundSize: '1.5em 1.5em',
            paddingRight: '3rem'
          }}
          {...props}
        >
          <option value="" disabled hidden>Selecione...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-base text-red-600 font-medium">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
