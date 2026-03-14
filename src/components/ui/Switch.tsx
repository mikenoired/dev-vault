import * as SwitchPrimitive from "@radix-ui/react-switch";
import { animate, motion, useMotionValue } from "motion/react";
import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "./utils";

export interface SwitchProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const TRACK_WIDTH = 34;
const TRACK_HEIGHT = 20;
const THUMB_SIZE = 16;
const THUMB_OFFSET = 2;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_OFFSET * 2;
const PILL_EXTEND = 2;
const PRESS_EXTEND = 4;
const PRESS_SHRINK = 4;
const DRAG_DEAD_ZONE = 2;

const moderateSpring = {
  type: "spring" as const,
  stiffness: 560,
  damping: 36,
  mass: 0.7,
};

export const Switch = forwardRef<HTMLDivElement, SwitchProps>(
  ({ label, checked, onCheckedChange, disabled = false, className, ...props }, ref) => {
    const hasMounted = useRef(false);
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);
    const dragging = useRef(false);
    const didDrag = useRef(false);
    const pointerStart = useRef<{ clientX: number; originX: number } | null>(null);

    const motionX = useMotionValue(checked ? THUMB_OFFSET + THUMB_TRAVEL : THUMB_OFFSET);

    useEffect(() => {
      hasMounted.current = true;
    }, []);

    const thumbWidth = pressed
      ? THUMB_SIZE + PRESS_EXTEND
      : hovered
        ? THUMB_SIZE + PILL_EXTEND
        : THUMB_SIZE;
    const thumbHeight = pressed ? THUMB_SIZE - PRESS_SHRINK : THUMB_SIZE;
    const thumbY = pressed ? THUMB_OFFSET + PRESS_SHRINK / 2 : THUMB_OFFSET;
    const extraWidth = thumbWidth - THUMB_SIZE;
    const thumbX = checked ? THUMB_OFFSET + THUMB_TRAVEL - extraWidth : THUMB_OFFSET;

    useEffect(() => {
      if (dragging.current) return;
      if (!hasMounted.current) {
        motionX.set(thumbX);
        return;
      }
      animate(motionX, thumbX, moderateSpring);
    }, [motionX, thumbX]);

    const handleToggle = useCallback(() => {
      onCheckedChange(!checked);
    }, [checked, onCheckedChange]);

    const handleKeyDown = useCallback(
      (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        handleToggle();
      },
      [disabled, handleToggle],
    );

    const handlePointerDown = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>) => {
        if (disabled) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        setPressed(true);
        dragging.current = false;
        didDrag.current = false;
        pointerStart.current = {
          clientX: event.clientX,
          originX: motionX.get(),
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      [disabled, motionX],
    );

    const handlePointerMove = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!pointerStart.current) return;

        const delta = event.clientX - pointerStart.current.clientX;
        if (!dragging.current) {
          if (Math.abs(delta) < DRAG_DEAD_ZONE) return;
          dragging.current = true;
        }

        const pressedThumbWidth = THUMB_SIZE + PRESS_EXTEND;
        const dragMin = THUMB_OFFSET;
        const dragMax = TRACK_WIDTH - THUMB_OFFSET - pressedThumbWidth;
        const rawX = pointerStart.current.originX + delta;
        motionX.set(Math.max(dragMin, Math.min(dragMax, rawX)));
      },
      [motionX],
    );

    const handlePointerUp = useCallback(() => {
      if (!pointerStart.current) return;

      setPressed(false);

      if (dragging.current) {
        didDrag.current = true;
        dragging.current = false;

        const currentX = motionX.get();
        const pressedThumbWidth = THUMB_SIZE + PRESS_EXTEND;
        const dragMin = THUMB_OFFSET;
        const dragMax = TRACK_WIDTH - THUMB_OFFSET - pressedThumbWidth;
        const midpoint = (dragMin + dragMax) / 2;
        const shouldBeOn = currentX > midpoint;

        if (shouldBeOn !== checked) {
          onCheckedChange(shouldBeOn);
        } else {
          animate(motionX, checked ? THUMB_OFFSET + THUMB_TRAVEL : THUMB_OFFSET, moderateSpring);
        }

        requestAnimationFrame(() => {
          didDrag.current = false;
        });
      }

      pointerStart.current = null;
    }, [checked, motionX, onCheckedChange]);

    return (
      <div
        ref={ref}
        role="switch"
        tabIndex={disabled ? -1 : 0}
        aria-checked={checked}
        aria-disabled={disabled}
        className={cn(
          "relative z-10 flex items-center gap-2.5 px-3 py-2 select-none touch-none",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          className,
        )}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onClick={() => {
          if (disabled || didDrag.current) return;
          handleToggle();
        }}
        {...props}
      >
        <SwitchPrimitive.Root
          checked={checked}
          onCheckedChange={(nextChecked) => {
            if (didDrag.current) return;
            onCheckedChange(nextChecked);
          }}
          disabled={disabled}
          className={cn(
            "relative shrink-0 rounded-full outline-none transition-colors duration-80",
            "focus-visible:ring-1 focus-visible:ring-[#6B97FF] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          style={{
            width: TRACK_WIDTH,
            height: TRACK_HEIGHT,
            backgroundColor: checked
              ? hovered
                ? "#5C89F2"
                : "#6B97FF"
              : hovered
                ? "color-mix(in oklab, var(--accent), var(--foreground) 10%)"
                : "var(--accent)",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <SwitchPrimitive.Thumb asChild>
            <motion.span
              className="absolute top-0 left-0 block rounded-full bg-white shadow-sm"
              initial={false}
              style={{ x: motionX }}
              animate={{
                y: thumbY,
                width: thumbWidth,
                height: thumbHeight,
              }}
              transition={hasMounted.current ? moderateSpring : { duration: 0 }}
            />
          </SwitchPrimitive.Thumb>
        </SwitchPrimitive.Root>

        <span
          className={cn(
            "text-[13px] transition-[color] duration-80",
            checked ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
      </div>
    );
  },
);

Switch.displayName = "Switch";
