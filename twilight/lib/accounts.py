import os
import csv
import random


def from_filepath(accounts_filepath):
    '''
    returns dict(
        consumer_key='...',
        consumer_secret='...',
        access_token='...',
        access_token_secret='...',
    )
    '''
    accounts_filepath = os.path.expanduser(accounts_filepath)
    with open(accounts_filepath) as accounts_fd:
        accounts = [row for row in csv.DictReader(accounts_fd)]
        random_account_index = random.randrange(len(accounts))
        return accounts[random_account_index]
