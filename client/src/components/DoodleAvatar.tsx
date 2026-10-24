import { useEffect, useState } from "react";
import { AVATAR_COLORS } from "../utils/avatar";

export default function DoodleAvatar({ index }: { index: number }) {
  const [expression, setExpression] = useState(0);
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setExpression((previous) => (previous + 1) % 3);
    }, 1800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <svg
      className="doodle-svg"
      viewBox="0 0 100 120"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Doodle avatar ${index + 1}`}
    >
      <path d="M27 70 L10 84 M73 70 L90 84" stroke="#222" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M29 68 Q50 58 71 68 L76 105 Q50 116 24 105 Z" fill={color} stroke="#222" strokeWidth="3" strokeLinejoin="round" />
      <path d="M38 105 L35 115 M62 105 L65 115" stroke="#222" strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="39" r="29" fill="#ffdfb5" stroke="#222" strokeWidth="3" />
      <path d="M22 35 Q18 5 43 10 Q63 0 77 24 L76 34 Q64 20 53 22 Q37 17 22 35" fill="#49352c" stroke="#222" strokeWidth="3" strokeLinejoin="round" />
      {expression === 1 ? (
        <path d="M34 37 Q39 32 44 37 M56 37 Q61 32 66 37" stroke="#222" strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : (
        <>
          <ellipse cx="39" cy="37" rx="3.5" ry="5" fill="#222" />
          <ellipse cx="61" cy="37" rx="3.5" ry="5" fill="#222" />
        </>
      )}
      {expression === 2 ? (
        <ellipse cx="50" cy="52" rx="5" ry="7" fill="#a33" stroke="#222" strokeWidth="2" />
      ) : (
        <path d="M40 51 Q50 61 60 51" stroke="#222" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      <circle cx="30" cy="47" r="4" fill="#ff9b9b" opacity="0.7" />
      <circle cx="70" cy="47" r="4" fill="#ff9b9b" opacity="0.7" />
    </svg>
  );
}