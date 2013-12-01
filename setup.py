import os
import json
from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
package = json.load(open(os.path.join(here, 'package.json')))

setup(
    name=package['name'].encode('utf8'),
    version=package['version'].encode('utf8'),
    url=package['homepage'].encode('utf8'),
    keywords=' '.join(package['keywords']).encode('utf8'),
    author=package['author']['name'].encode('utf8'),
    author_email=package['author']['email'].encode('utf8'),
    description=package['description'].encode('utf8'),
    long_description=open('README.rst').read(),
    license=open('LICENSE').read(),
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    classifiers=[
        'Development Status :: 4 - Beta',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2.7',
        'Topic :: Text Processing :: General',
    ],
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
