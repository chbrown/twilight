export interface OAuth {
    consumer_key: string;
    consumer_secret: string;
    token: string;
    token_secret: string;
}
/**
Try to get read OAuth credentials from the environment (since in testing we
might want to specify all oauth credentials via the environment), and,
failing that, from ~/.twitter.
*/
export declare function getOAuth(callback: (error: Error, oauth?: OAuth) => void): void;
