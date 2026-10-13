import { useCallback, useState } from "react";

/**
 * Minimal controlled/uncontrolled value helper, used so
 * `DestinationBrickWorld` can support `selectedDestinationId` (controlled)
 * or `defaultSelectedDestinationId` (uncontrolled) without duplicating the
 * pattern by hand.
 */
export function useControllableState<T>(
  controlledValue: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
): [T, (value: T) => void] {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<T>(defaultValue);

  const value = isControlled ? (controlledValue as T) : internalValue;

  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) {
        setInternalValue(next);
      }
      onChange?.(next);
    },
    [isControlled, onChange]
  );

  return [value, setValue];
}
