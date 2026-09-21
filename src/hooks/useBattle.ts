import { useMemo } from "react";
import { Battle } from "../domain/battles";
import { battleForDay, rotationAngleForDay } from "../domain/schedule";

export function useBattle(dayString: string): [Battle, number, number] {
  const battle = useMemo(() => battleForDay(dayString), [dayString]);

  const randomAngle = useMemo(
    () => rotationAngleForDay(dayString),
    [dayString]
  );

  const imageScale = useMemo(() => {
    const normalizedAngle = 45 - (randomAngle % 90);
    const radianAngle = (normalizedAngle * Math.PI) / 180;
    return 1 / (Math.cos(radianAngle) * Math.sqrt(2));
  }, [randomAngle]);

  return [battle, randomAngle, imageScale];
}
