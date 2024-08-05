/**
This module should be a different file from the main API logic since credentials
may come from the environment or a file, or perhaps other sources.
*/
import {logger} from 'loge';
import {readToEnd} from 'streaming';
import {Parser} from '@chbrown/sv';
import {createReadStream} from 'fs';

export interface OAuth {
  consumer_key: string; // 'ziurk0AOdn71U63Yp9EG4'
  consumer_secret: string; // 'VKmTsGrk2JjH4qcYFpaAX5iEDthoW7ZyeU03NxPS1ld'
  token: string; // '915051675-bCH2SYP6Ok9epWwnu7A0DhrlIQBMUaoLtxVzfRG5'
  token_secret: string; // 'VcLOIzA0mkiCSbUYDWrNv3n86EXJa4HQKMgqfd7'
}

interface Account extends OAuth {
  id: number; // 226
  account_id: number; // 730
  screen_name?: string; // 'leoparder'
  created?: string;
  details_json?: string;
}

/**
Read accounts from tab/comma-separated values in `filepath`, which
should have the headers: consumer_key, consumer_secret, token, token_secret,
choose one at random, and use that.
*/
function getOAuthFromFile(filepath: string, callback: (error: Error, oauth?: OAuth) => void): void {
  let parser = createReadStream(filepath, {encoding: 'utf8'}).pipe(new Parser());
  readToEnd(parser, (error: Error, accounts: Account[]) => {
    if (error) return callback(error);

    let {consumer_key, consumer_secret, token, token_secret} = accounts[Math.random() * accounts.length | 0];
    callback(null, {consumer_key, consumer_secret, token, token_secret});
  });
}

/**
Try to get read OAuth credentials from the environment (since in testing we
might want to specify all oauth credentials via the environment), and,
failing that, from ~/.twitter.
*/
export function getOAuth(callback: (error: Error, oauth?: OAuth) => void): void {
  let {consumer_key, consumer_secret, token, token_secret} = process.env;
  if (consumer_key && consumer_secret && token && token_secret) {
    callback(null, {consumer_key, consumer_secret, token, token_secret});
  }
  else {
    // otherwise (in the normal case) get oauth account info from file
    const defaultFilepath = `${process.env.HOME}/.twitter`;
    getOAuthFromFile(defaultFilepath, callback);
  }
}
