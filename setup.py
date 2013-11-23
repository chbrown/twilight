import os
import json
from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
package = json.load(open(os.path.join(here, 'package.json')))
name = str(package['name'])  # i.e., twilight

setup(
    name=name,
    version=str(package['version']),
    author='Christopher Brown',
    author_email='chrisbrown@utexas.edu',
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'psutil',
        'pyshp >= 1.2.0',
        'redis',
        'twython',
    ],
    entry_points={
        'console_scripts': [
            'twilight = twilight.cli.main:main'
        ],
    },
)
