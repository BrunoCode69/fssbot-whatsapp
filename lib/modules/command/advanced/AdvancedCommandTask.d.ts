import type { AdvancedCommandJob } from "./AdvancedCommandJob";
export declare type AdvancedCommandTask<T extends object> = (job: AdvancedCommandJob<T>) => Promise<void> | void;
