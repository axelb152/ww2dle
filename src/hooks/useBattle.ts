import { useMemo } from "react";
import seedrandom from "seedrandom";
import { battlesWithImage, Battle } from "../domain/battles";

// Anniversary pins: on these dates (all after the 2026-08-01 launch), the
// daily battle is forced to the given battle code instead of the seeded
// random pick, so the puzzle lands on the anniversary of the battle itself
// (e.g. Pearl Harbor on Dec 7, D-Day on Jun 6). Keys are yyyy-MM-dd day
// strings, values are codes from src/domain/battles.ts.
const forcedBattles: Record<string, string> = {
  "2026-09-01": "westerplatte", // invasion of Poland began 1939-09-01
  "2026-10-23": "el-alamein", // Second El Alamein opened 1942-10-23
  "2026-12-07": "pearl-harbor", // attack on Pearl Harbor 1941-12-07
  "2026-12-16": "bastogne", // Battle of the Bulge began 1944-12-16
  "2027-02-19": "iwo-jima", // Iwo Jima landings 1945-02-19
  "2027-04-01": "okinawa", // Okinawa landings 1945-04-01
  "2027-06-04": "midway", // Battle of Midway began 1942-06-04
  "2027-06-06": "normandy", // D-Day 1944-06-06
  "2027-07-05": "kursk", // Battle of Kursk began 1943-07-05
  "2027-08-23": "stalingrad", // Battle of Stalingrad began 1942-08-23
};

export function useBattle(dayString: string): [Battle, number, number] {
  const battle = useMemo(() => {
    const forcedBattleCode = forcedBattles[dayString];
    const forcedBattle =
      forcedBattleCode != null
        ? battlesWithImage.find((battle) => battle.code === forcedBattleCode)
        : undefined;

    return (
      forcedBattle ??
      battlesWithImage[
        Math.floor(seedrandom.alea(dayString)() * battlesWithImage.length)
      ]
    );
  }, [dayString]);

  const randomAngle = useMemo(
    () => seedrandom.alea(dayString)() * 360,
    [dayString]
  );

  const imageScale = useMemo(() => {
    const normalizedAngle = 45 - (randomAngle % 90);
    const radianAngle = (normalizedAngle * Math.PI) / 180;
    return 1 / (Math.cos(radianAngle) * Math.sqrt(2));
  }, [randomAngle]);

  return [battle, randomAngle, imageScale];
}
