import type ListMessage from '../messages/ListMessage';
export declare function createInteractiveListPayload(message: ListMessage): {
    __useBaileysHelper: boolean;
    text: string;
    title: string;
    footer: string;
    interactiveButtons: {
        name: string;
        buttonParamsJson: string;
    }[];
};
