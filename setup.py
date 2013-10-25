from setuptools import setup

import json
from os import path
here = path.abspath(path.dirname(__file__))
package = json.load(open(path.join(here, 'package.json')))
name = str(package['name'])  # i.e., twilight

setup(
    name=name,
    version=str(package['version']),
    author='Christopher Brown',
    author_email='chrisbrown@utexas.edu',
    packages=['twilight'],
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'psutil',
        'pyshp >= 1.2.0',
        'redis',
        'twython',
        'ujson',
    ],
    entry_points={
        'console_scripts': [
            'json2ttv2 = twilight.json2ttv2:main',
            'twilight-tweetop = twilight.tweetop:main',
            'twilight-geogrep = twilight.geogrep:main',
            'twilight-user = twilight.user:main',
            'twilight-aggregate = twilight.aggregate:main',
            'twilight-countries = twilight.countries:main',
        ],
    },
)
