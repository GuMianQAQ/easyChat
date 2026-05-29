import { useEffect, useRef, useState } from "react";

interface PupilProps {
  mouseX: number;
  mouseY: number;
  size?: number;
  maxDistance?: number;
  forceLookX?: number;
  forceLookY?: number;
}

function Pupil({
  mouseX,
  mouseY,
  size = 12,
  maxDistance = 5,
  forceLookX,
  forceLookY,
}: PupilProps) {
  const pupilRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!pupilRef.current) {
      return;
    }

    if (forceLookX !== undefined && forceLookY !== undefined) {
      setPosition({ x: forceLookX, y: forceLookY });
      return;
    }

    const rect = pupilRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    setPosition({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    });
  }, [forceLookX, forceLookY, maxDistance, mouseX, mouseY]);

  return (
    <div
      ref={pupilRef}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        backgroundColor: "#2d2d2d",
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: "transform 0.1s ease-out",
      }}
    />
  );
}

interface EyeBallProps extends PupilProps {
  eyeSize?: number;
  pupilSize?: number;
  isBlinking?: boolean;
}

function EyeBall({
  mouseX,
  mouseY,
  eyeSize = 18,
  pupilSize = 7,
  maxDistance = 5,
  isBlinking = false,
  forceLookX,
  forceLookY,
}: EyeBallProps) {
  const eyeRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!eyeRef.current) {
      return;
    }

    if (forceLookX !== undefined && forceLookY !== undefined) {
      setPosition({ x: forceLookX, y: forceLookY });
      return;
    }

    const rect = eyeRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    setPosition({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    });
  }, [forceLookX, forceLookY, maxDistance, mouseX, mouseY]);

  return (
    <div
      ref={eyeRef}
      style={{
        width: `${eyeSize}px`,
        height: isBlinking ? "2px" : `${eyeSize}px`,
        borderRadius: "50%",
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        transition: "height 0.15s ease",
      }}
    >
      {!isBlinking ? (
        <div
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            borderRadius: "50%",
            backgroundColor: "#2d2d2d",
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: "transform 0.1s ease-out",
          }}
        />
      ) : null}
    </div>
  );
}

interface AnimatedCharactersProps {
  nicknameFocused: boolean;
  passwordFocused: boolean;
  passwordLength: number;
}

function AnimatedCharacters({
  nicknameFocused,
  passwordFocused,
  passwordLength,
}: AnimatedCharactersProps) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [purpleBlinking, setPurpleBlinking] = useState(false);
  const [blackBlinking, setBlackBlinking] = useState(false);
  const [lookAtEachOther, setLookAtEachOther] = useState(false);

  const purpleRef = useRef<HTMLDivElement | null>(null);
  const blackRef = useRef<HTMLDivElement | null>(null);
  const yellowRef = useRef<HTMLDivElement | null>(null);
  const orangeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMouseX(event.clientX);
      setMouseY(event.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const schedule = () => {
      const timer = window.setTimeout(() => {
        setPurpleBlinking(true);
        window.setTimeout(() => {
          setPurpleBlinking(false);
          schedule();
        }, 150);
      }, Math.random() * 4000 + 3000);

      return timer;
    };

    const timer = schedule();
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const schedule = () => {
      const timer = window.setTimeout(() => {
        setBlackBlinking(true);
        window.setTimeout(() => {
          setBlackBlinking(false);
          schedule();
        }, 150);
      }, Math.random() * 4000 + 3000);

      return timer;
    };

    const timer = schedule();
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!nicknameFocused) {
      setLookAtEachOther(false);
      return;
    }

    setLookAtEachOther(true);
    const timer = window.setTimeout(() => setLookAtEachOther(false), 800);
    return () => window.clearTimeout(timer);
  }, [nicknameFocused]);

  const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) {
      return { faceX: 0, faceY: 0, bodySkew: 0 };
    }

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;

    return {
      faceX: Math.max(-15, Math.min(15, deltaX / 20)),
      faceY: Math.max(-10, Math.min(10, deltaY / 30)),
      bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)),
    };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const orangePos = calculatePosition(orangeRef);
  const yellowPos = calculatePosition(yellowRef);

  const isLookingAway = passwordFocused;
  const hasPasswordValue = passwordLength > 0;

  const baseStyle = (
    backgroundColor: string,
    zIndex: number,
    dimensions: Record<string, string>,
    transform: string,
  ) => ({
    position: "absolute" as const,
    backgroundColor,
    zIndex,
    bottom: "-2px",
    borderBottom: `4px solid ${backgroundColor}`,
    transformOrigin: "bottom center",
    willChange: "transform",
    transition: "transform 0.6s ease-out, height 0.6s ease-in-out",
    transform,
    ...dimensions,
  });

  return (
    <div className="characters-scene">
      <div
        ref={purpleRef}
        style={baseStyle(
          "#6c3ff5",
          1,
          {
            left: "70px",
            width: "180px",
            height: isLookingAway || nicknameFocused ? "440px" : "400px",
            borderRadius: "10px 10px 0 0",
          },
          isLookingAway
            ? "skewX(-14deg) translateX(-20px) translateZ(0)"
            : nicknameFocused
              ? `skewX(${purplePos.bodySkew - 12}deg) translateX(40px) translateZ(0)`
              : `skewX(${purplePos.bodySkew}deg) translateZ(0)`,
        )}
      >
        <div
          style={{
            position: "absolute",
            display: "flex",
            gap: "32px",
            left: isLookingAway
              ? "20px"
              : lookAtEachOther
                ? "55px"
                : `${45 + purplePos.faceX}px`,
            top: isLookingAway
              ? "25px"
              : lookAtEachOther
                ? "65px"
                : `${40 + purplePos.faceY}px`,
            transition: "all 0.6s ease-out",
          }}
        >
          <EyeBall
            mouseX={mouseX}
            mouseY={mouseY}
            isBlinking={purpleBlinking}
            forceLookX={isLookingAway ? -5 : lookAtEachOther ? 3 : undefined}
            forceLookY={isLookingAway ? -5 : lookAtEachOther ? 4 : undefined}
          />
          <EyeBall
            mouseX={mouseX}
            mouseY={mouseY}
            isBlinking={purpleBlinking}
            forceLookX={isLookingAway ? -5 : lookAtEachOther ? 3 : undefined}
            forceLookY={isLookingAway ? -5 : lookAtEachOther ? 4 : undefined}
          />
        </div>
      </div>

      <div
        ref={blackRef}
        style={baseStyle(
          "#2d2d2d",
          2,
          {
            left: "240px",
            width: "120px",
            height: "310px",
            borderRadius: "8px 8px 0 0",
          },
          isLookingAway
            ? "skewX(12deg) translateX(-10px) translateZ(0)"
            : lookAtEachOther
              ? `skewX(${blackPos.bodySkew * 1.5 + 10}deg) translateX(20px) translateZ(0)`
              : `skewX(${blackPos.bodySkew * 1.5}deg) translateZ(0)`,
        )}
      >
        <div
          style={{
            position: "absolute",
            display: "flex",
            gap: "24px",
            left: isLookingAway ? "10px" : lookAtEachOther ? "32px" : `${26 + blackPos.faceX}px`,
            top: isLookingAway ? "20px" : lookAtEachOther ? "12px" : `${32 + blackPos.faceY}px`,
            transition: "all 0.6s ease-out",
          }}
        >
          <EyeBall
            mouseX={mouseX}
            mouseY={mouseY}
            eyeSize={16}
            pupilSize={6}
            isBlinking={blackBlinking}
            forceLookX={isLookingAway ? -4 : lookAtEachOther ? 0 : undefined}
            forceLookY={isLookingAway ? -5 : lookAtEachOther ? -4 : undefined}
          />
          <EyeBall
            mouseX={mouseX}
            mouseY={mouseY}
            eyeSize={16}
            pupilSize={6}
            isBlinking={blackBlinking}
            forceLookX={isLookingAway ? -4 : lookAtEachOther ? 0 : undefined}
            forceLookY={isLookingAway ? -5 : lookAtEachOther ? -4 : undefined}
          />
        </div>
      </div>

      <div
        ref={orangeRef}
        style={baseStyle(
          "#ff9b6b",
          3,
          {
            left: "0px",
            width: "240px",
            height: "200px",
            borderRadius: "120px 120px 0 0",
          },
          `skewX(${orangePos.bodySkew}deg) translateZ(0)`,
        )}
      >
        <div
          style={{
            position: "absolute",
            display: "flex",
            gap: "32px",
            left: isLookingAway ? "50px" : `${82 + orangePos.faceX}px`,
            top: isLookingAway ? "75px" : `${90 + orangePos.faceY}px`,
            transition: "all 0.2s ease-out",
          }}
        >
          <Pupil
            mouseX={mouseX}
            mouseY={mouseY}
            forceLookX={isLookingAway ? -5 : undefined}
            forceLookY={isLookingAway ? -5 : undefined}
          />
          <Pupil
            mouseX={mouseX}
            mouseY={mouseY}
            forceLookX={isLookingAway ? -5 : undefined}
            forceLookY={isLookingAway ? -5 : undefined}
          />
        </div>
      </div>

      <div
        ref={yellowRef}
        style={baseStyle(
          "#e8d754",
          4,
          {
            left: "310px",
            width: "140px",
            height: "230px",
            borderRadius: "70px 70px 0 0",
          },
          `skewX(${yellowPos.bodySkew}deg) translateZ(0)`,
        )}
      >
        <div
          style={{
            position: "absolute",
            display: "flex",
            gap: "24px",
            left: isLookingAway ? "20px" : `${52 + yellowPos.faceX}px`,
            top: isLookingAway ? "30px" : `${40 + yellowPos.faceY}px`,
            transition: "all 0.2s ease-out",
          }}
        >
          <Pupil
            mouseX={mouseX}
            mouseY={mouseY}
            forceLookX={isLookingAway ? -5 : undefined}
            forceLookY={isLookingAway ? -5 : undefined}
          />
          <Pupil
            mouseX={mouseX}
            mouseY={mouseY}
            forceLookX={isLookingAway ? -5 : undefined}
            forceLookY={isLookingAway ? -5 : undefined}
          />
        </div>
        <div
          style={{
            position: "absolute",
            width: "80px",
            height: "4px",
            backgroundColor: "#2d2d2d",
            borderRadius: "999px",
            left: isLookingAway ? "15px" : `${40 + yellowPos.faceX}px`,
            top: isLookingAway ? "78px" : `${88 + yellowPos.faceY}px`,
            transition: "all 0.2s ease-out",
          }}
        />
      </div>

      {hasPasswordValue ? (
        <div
          style={{
            position: "absolute",
            left: "190px",
            bottom: "120px",
            width: "32px",
            height: "16px",
            border: "3px solid #2d2d2d",
            borderTop: "none",
            borderRadius: "0 0 14px 14px",
            opacity: 0.7,
            transition: "opacity 0.3s ease-out",
          }}
        />
      ) : null}
    </div>
  );
}

export default AnimatedCharacters;
