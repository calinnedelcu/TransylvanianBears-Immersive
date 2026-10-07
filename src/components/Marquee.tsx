import './Marquee.css';

type MarqueeProps = {
  items: string[];
  /** Seconds for one full loop. */
  duration?: number;
  className?: string;
};

function Star() {
  return (
    <svg className="marquee__star" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M12 0c.8 6.600 4.900 10.800 12 12-7.100 1.200-11.200 5.400-12 12-.8-6.600-4.900-10.800-12-12C7.100 10.800 11.200 6.600 12 0Z" />
    </svg>
  );
}

/**
 * Decorative ticker. Everything it says is repeated in the page content,
 * so it is hidden from assistive technology.
 */
export function Marquee({ items, duration = 48, className = '' }: MarqueeProps) {
  return (
    <div className={`marquee ${className}`.trim()} aria-hidden="true">
      <div className="marquee__track" style={{ animationDuration: `${duration}s` }}>
        {[0, 1].map((copy) => (
          <ul className="marquee__group" key={copy}>
            {items.map((item) => (
              <li key={item}>
                <span>{item}</span>
                <Star />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
