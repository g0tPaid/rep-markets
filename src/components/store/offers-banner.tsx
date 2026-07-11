'use client';

const OFFERS = [
  'OFFERS',
  'NEW DROP',
  'FREE SHIPPING OVER $150',
  'OFFERS',
  'MEMBERS 10% OFF',
  'LIMITED PIECES',
];

export function OffersBanner() {
  const line = OFFERS.join('  ·  ');
  const loop = `${line}  ·  ${line}  ·  `;

  return (
    <div className="overflow-hidden border-b border-hairline bg-black py-2 text-white" aria-label="Offers">
      <div className="offers-marquee flex w-max whitespace-nowrap text-[10px] font-semibold tracking-[0.28em]">
        <span className="px-2">{loop}</span>
        <span className="px-2" aria-hidden>
          {loop}
        </span>
      </div>
    </div>
  );
}
