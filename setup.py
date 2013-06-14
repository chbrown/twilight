from setuptools import setup
import json
from os import path
here = path.abspath(path.dirname(__file__))
package = json.load(open(path.join(here, 'package.json')))

setup(
    name=str(package['name']),
    version=str(package['version']),
    author='Christopher Brown',
    author_email='chrisbrown@utexas.edu',
    packages=[package['name']],
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'pyshp',
        'psutil',
        'twython',
    ],
    entry_points={
        'console_scripts': [
            'json2ttv2 = twilight.json2ttv2:main',
            'tweetop = twilight.tweetop:main',
            'geogrep = twilight.geogrep:main',
            'twitter-user = twilight.user:main',
        ],
    },
)
