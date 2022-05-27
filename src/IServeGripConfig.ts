import { IGripConfig } from "@fastly/grip-compute-js";
import { IServeGripConfig as IBaseServeGripConfig } from "@fanoutio/serve-grip";
import { PublisherBase } from "@fanoutio/grip";

export interface IServeGripConfig extends Omit<IBaseServeGripConfig, 'grip'> {
    grip?: string | IGripConfig | IGripConfig[] | PublisherBase<any>;
}
