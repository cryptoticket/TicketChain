#! /bin/bash
#
# See: http://docs.mongodb.org/manual/tutorial/install-mongodb-on-ubuntu/
# For Ubuntu only
#

sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10

echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list

sudo apt-get update

sudo apt-get install mongodb-10gen

#sudo service mongodb start

