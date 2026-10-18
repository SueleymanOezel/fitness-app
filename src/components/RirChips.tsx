import Chip from './Chip'

const RIR_VALUES = [0, 1, 2, 3, 4, 5] as const

/** Anstrengung als „Wiederholungen in Reserve“ (0–5+); erneutes Tippen auf den gewählten Wert löscht ihn. */
export default function RirChips({ value, onChange }: { value: number | null; onChange: (next: number | null) => void }) {
  return (
    // Six equal columns: all values on one row and every chip at least 44 px wide on a phone.
    <fieldset className="grid grid-cols-6 gap-2">
      <legend>Wie viele hättest du noch geschafft?</legend>
      {RIR_VALUES.map((option) => (
        <Chip
          key={option}
          className="min-w-11 px-0!"
          active={value === option}
          // Pressed rather than disabled: tapping the same value again clears
          // it, so a mistap does not stick for the rest of the session.
          onClick={() => onChange(value === option ? null : option)}
        >
          {option === 5 ? '5+' : String(option)}
        </Chip>
      ))}
    </fieldset>
  )
}
