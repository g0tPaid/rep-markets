'use client';

const MESSAGE = (
  <>
    Resellers contact directly on{' '}
    <a
      href="https://wa.me/8618059262730?text=Hi%20AJ%2C%20I%27m%20a%20reseller"
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold underline underline-offset-2"
      style={{ color: '#25D366' }}
    >
      WhatsApp
    </a>
  </>
);

export function OffersBanner() {
  return (
    <div
      className="overflow-hidden border-b border-hairline bg-black py-2.5 text-white"
      aria-label="Reseller notice"
    >
      <div className="offers-marquee flex w-max whitespace-nowrap text-[11px] font-semibold tracking-[0.12em]">
        <span className="inline-flex items-center gap-8 px-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={`a-${index}`} className="inline-flex items-center gap-8">
              {MESSAGE}
              <span aria-hidden>·</span>
            </span>
          ))}
        </span>
        <span className="inline-flex items-center gap-8 px-4" aria-hidden>
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={`b-${index}`} className="inline-flex items-center gap-8">
              {MESSAGE}
              <span>·</span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
