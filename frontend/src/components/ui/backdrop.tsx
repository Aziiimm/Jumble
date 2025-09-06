import React from "react";

interface BackdropProps {
  children: React.ReactNode;
  className?: string;
  variant?: "geometric" | "dots" | "waves" | "coral";
}

// Define different backdrop patterns
const backdropPatterns = {
  geometric: {
    "--s": "200px",
    "--c1": "#1d1d1d",
    "--c2": "#4e4f51",
    "--c3": "#3c3c3c",
    background: `
      repeating-conic-gradient(
        from 30deg,
        #0000 0 120deg,
        var(--c3) 0 180deg
      )
      calc(0.5 * var(--s)) calc(0.5 * var(--s) * 0.577),
      repeating-conic-gradient(
        from 30deg,
        var(--c1) 0 60deg,
        var(--c2) 0 120deg,
        var(--c3) 0 180deg
      )
    `,
    backgroundSize: "var(--s) calc(var(--s) * 0.577)",
  },
  dots: {
    "--s": "60px",
    "--c1": "#180a22",
    "--c2": "#5b42f3",
    "--_g":
      "radial-gradient(25% 25% at 25% 25%, var(--c1) 99%, rgba(0, 0, 0, 0) 101%)",
    background: `
      var(--_g) var(--s) var(--s) / calc(2 * var(--s)) calc(2 * var(--s)),
      var(--_g) 0 0 / calc(2 * var(--s)) calc(2 * var(--s)),
      radial-gradient(50% 50%, var(--c2) 98%, rgba(0, 0, 0, 0)) 0 0 / var(--s) var(--s),
      repeating-conic-gradient(var(--c2) 0 50%, var(--c1) 0 100%) calc(0.5 * var(--s)) 0 / calc(2 * var(--s)) var(--s)
    `,
  },
  waves: {
    "--s": "100px",
    "--c1": "#1a1a2e",
    "--c2": "#16213e",
    "--c3": "#0f3460",
    background: `
      radial-gradient(circle at 25% 25%, var(--c1) 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, var(--c2) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, var(--c3) 0%, transparent 50%),
      linear-gradient(45deg, var(--c1) 25%, transparent 25%),
      linear-gradient(-45deg, var(--c2) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--c3) 75%),
      linear-gradient(-45deg, transparent 75%, var(--c1) 75%)
    `,
    backgroundSize:
      "var(--s) var(--s), var(--s) var(--s), var(--s) var(--s), calc(var(--s)/2) calc(var(--s)/2), calc(var(--s)/2) calc(var(--s)/2), calc(var(--s)/2) calc(var(--s)/2), calc(var(--s)/2) calc(var(--s)/2)",
  },
  coral: {
    "--s": "150px",
    "--c1": "#ff847c",
    "--c2": "#e84a5f",
    "--c3": "#fecea8",
    "--c4": "#99b898",
    background: `
      conic-gradient(
        from 45deg at 75% 75%,
        var(--c3) 90deg,
        var(--c1) 0 180deg,
        #0000 0
      ),
      conic-gradient(from -45deg at 25% 25%, var(--c3) 90deg, #0000 0),
      conic-gradient(from -45deg at 50% 100%, #0000 180deg, var(--c3) 0),
      conic-gradient(
        from -45deg,
        var(--c1) 90deg,
        var(--c2) 0 225deg,
        var(--c4) 0
      )
    `,
    backgroundSize: "var(--s) var(--s)",
  },
};

export const Backdrop: React.FC<BackdropProps> = ({
  children,
  className = "",
  variant = "geometric", // Default to geometric pattern
}) => {
  const pattern = backdropPatterns[variant];

  return (
    <div
      className={`backdrop-container ${className}`}
      style={
        {
          width: "100%",
          height: "100%",
          ...pattern,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
};
