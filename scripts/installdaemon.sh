#!/bin/bash

# *** Optional
sudo touch /var/log/ticketchain.log
sudo chown ubuntu:ubuntu /var/log/ticketchain.log

# Set all params in 'config.json' file
sudo cp ticketchain /etc/init.d/
sudo update-rc.d ticketchain defaults

