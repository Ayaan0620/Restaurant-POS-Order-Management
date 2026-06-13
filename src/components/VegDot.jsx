// Standard Indian veg / non-veg marker: a square outline with a filled dot.
// Green = vegetarian, red = non-vegetarian.
export default function VegDot({ veg, size = 16 }) {
  const color = veg ? '#16a34a' : '#dc2626'
  return (
    <span
      aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
      title={veg ? 'Veg' : 'Non-veg'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        border: `2px solid ${color}`,
        borderRadius: 3,
        flex: 'none',
      }}
    >
      <span
        style={{
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: '50%',
          background: color,
        }}
      />
    </span>
  )
}
