#!/usr/bin/env python

from __future__ import with_statement
from pychart import *
from datetime import *
import string
import re, sys
import pdb

class LocationChange():
	# do we have any class variable ?

	def __init__(self):
		self.stime = None
		self.etime = None
		self.acculine = []
		self.timeline = []
		self.dataset = []
		# the start time and end time
		self.xstart = 19
		self.xend = 22

	def getData(self, file):
		with open(file) as f:
			for line in f:
				line_eles = string.split(line)

				if len(line_eles) < 2 or not re.search('onLocationChanged', line):
					continue
				
				#print line_eles
				hhmmss = line_eles[1].split('.')[0]
				hh = int(hhmmss.split(':')[0])
				mm = int(hhmmss.split(':')[1])
				ss = int(hhmmss.split(':')[2])

				# put your interested time interval here
				if hh < self.xstart or hh > self.xend:
					continue
	
				if self.stime is None:
					self.stime = hhmmss
				self.etime = hhmmss

				# the hour when bouncing happened
				self.interval = ((hh-int(self.stime.split(':')[0]))*60 + mm-int(self.stime.split(':')[1]))*60 + ss
				self.interval /= 60  # convert to minutes
				if self.interval < 0 :
					continue

				#pdb.set_trace() 
				loc_eles = line_eles[5].split(',')
				for item in loc_eles:
					if re.search('mAccuracy', item):
						accuracy = int(float(item.split('=')[1]))
						self.acculine.append(accuracy)
						#data = chart_data.transform(lambda x: self.xstart+x[0]/60, x[1]], data)
						self.dataset.append((self.interval,accuracy))
		return self.dataset

	def makechart(self, data):
			def interval_to_time(m):
				curtime = datetime.now()
				return m

			def format_time(m):
				hour = m/60
				min = m%60
				if min < 10:
					return "/a60/7{}" + str(self.xstart+hour)+':0'+str(min)+'pm'
				else:
					return "/a60/7{}" + str(self.xstart+hour)+':'+str(min)+'pm'

				
			theme.get_options()
			chart_object.set_defaults(line_plot.T, line_style=None)

			tick1 = tick_mark.Circle(size=2, fill_style=fill_style.black)
			tick2 = tick_mark.Circle(size=4, fill_style=fill_style.black)

			#xaxis = axis.X(label="Time", format="/a-60{}%d", tic_interval=20)
			xaxis = axis.X(label="Time", format=format_time)
			yaxis = axis.Y(label="Location Accuracy(meters)", tic_interval=30)

			data = chart_data.transform(lambda x: [interval_to_time(x[0]), x[1]], data)

			#ar = area.T(x_axis=xaxis, y_axis=yaxis,y_coord=log_coord.T(), y_range=(0,None),
			ar = area.T(x_axis=xaxis, y_axis=yaxis, 
						x_coord=category_coord.T(data, 0), y_coord=log_coord.T(), 
			            x_grid_interval=10, x_grid_style=line_style.gray70_dash3,
						size=(360, 110),
						legend = legend.T(loc=(150, 10)), 
						loc = (0, 0))

			ar.add_plot(line_plot.T(label="/8Location Updates from framework with diff accuracy levels\neven when phone did not move", data=data,tick_mark=tick1))
			#ar.add_plot(line_plot.T(label="LocationUpdate", data=[(10,20), (20,30), (30, 40)], tick_mark=tick2))
			#ar.add_plot(line_plot.T(label="LocationUpdate", data=randomdata(), tick_mark=tick2))
			ar.draw()

if __name__ == '__main__':
	if len(sys.argv) < 2:
		print "Usage: python onlocationchange.py logfile"
		sys.exit()

	locs = LocationChange()
	data = locs.getData('./suren.log')
	locs.makechart(data)
