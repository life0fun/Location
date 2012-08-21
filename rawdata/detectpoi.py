#!/usr/bin/env python

from __future__ import with_statement
from pychart import *
from datetime import *
import string
import re, sys
import pdb

class DetectPOI():
    KEYWORDS = "onLocationChanged|addCurrentLocToDb|loadPoiList|LSAPP_VSM|'notify VSM'"

    def __init__(self, logfile):
        self.logfile = logfile
        self.stime = None
        self.etime = None
        self.pois = {}
        self.entering = {}
        self.leaving = {}
        self.candidates = []
        self.detections = []
        self.timeline = []
        self.curloc = {}

        # start and exit range
        self.xstart = 0
        self.xend = 0

    def getData(self):
        with open(self.logfile) as f:
            for line in f:

                if not re.search(DetectPOI.KEYWORDS, line):
                    continue
                
                if not self.processTime(line):
                    continue

                #pdb.set_trace() 

                #the current fix
                if line.find('onLocationChanged()') > 0:
                    self.processLocationFix(line)
                    continue

                # get poi info
                if line.find('loadPoiList') > 0:
                    self.processPoiInfo(line)
                    continue

                if line.find('addCurrentLocToDb') > 0:
                    self.processCandidate(line)
                    continue

                if line.find('LSAPP_VSM') > 0:
                    self.processVSM(line)
                    continue


    def processTime(self, line):
        line_eles = line.split()
        hhmmss = line_eles[1].split('.')[0]
        hh = int(hhmmss.split(':')[0])
        mm = int(hhmmss.split(':')[1])
        ss = int(hhmmss.split(':')[2])

        # put yourinterested time interval here
        if self.xstart and (hh < self.xstart or hh > self.xend):
            return False

        if self.stime is None:
            self.stime = hhmmss
        self.etime= hhmmss

        # the hourwhen bouncing happened
        self.interval = ((hh-int(self.stime.split(':')[0]))*60 + mm-int(self.stime.split(':')[1]))*60 + ss
        self.interval /= 60  # convert to minutes
        if self.interval < 0 :
            return False

        return True

    def processLocationFix(self, line):
        start = line.find('mProvider=');
        end = line.find('mAccuracy=')
        if start <= 0 or end <= 0:
           return

        end = line.find(',', end)
        info = line[start:end].strip()
        
        d={}
        for k,v in [val.split('=') for val in info.split(',')]:
            fkey = self.formatKey(k)
            if not fkey:
                 continue

            if(self.formatKey(k) == 'timestamp'):
                v = self.formatDatetime(v.strip())
            if fkey == 'lat' or fkey == 'lgt':
                v = ('%.6f' % float(v.strip())).strip()
            elif fkey == 'accuracy':
                v = ('%f' % float(v)).rstrip('0').rstrip('.')
            else:
                v = v.strip()
            d[fkey] = v

        self.curloc = d
        print self.curloc
        return self.curloc

            
    def processVSM(self, line):
        start = line.find('Meaningfullocation')
        if start <= 0: 
           return

        start = line.find('=', start)
        end = line.find(';', start)
        info = line[start+1:end]

        if self.curloc:
            self.curloc['poi'] = info
            self.curloc['type'] = 'detection'
            self.detections.append(self.curloc)
            self.timeline.append(self.curloc)
        return self.curloc

    def processPoiInfo(self, line):
        start = line.find('_id=')
        end = line.find('radius=')
        if start <= 0 or end <= 0:
            return

        end = line.find(',', end)
        info = line[start:end].strip()
        
        d = {}
        for k,v in [val.split('=') for val in info.split(',')]:
            d[self.formatKey(k)] = v.strip()

        # use id column value as the key of pois dict
        if not self.pois.has_key(d['_id']):
            self.pois[d['_id']] = d

    def processCandidate(self, line):
        start = line.lower().find('Count=')
        end = line.lower().find('CellJsonValue=')
        if start <= 0 or end <= 0:
            return

        info = line[start:end].strip()

        d = {}
        for k,v in [val.split('=') for val in info.split(' ')]:
            if(self.formatKey(k) == 'timestamp'):
                v = self.formatDatetime(v.strip())

            d[self.formatKey(k)] = v.strip()

        d['type']='discovery'
        self.candidates.append(d)
        self.timeline.append(d)

    def formatKey(self, key):
        lkey = key.strip().lower()
        if re.search('_id', lkey):
            return lkey
        if re.search('poi|tag', lkey):
            return 'poi'
        elif re.search('lat|latitude', lkey):
            return 'lat'
        elif re.search('lgt|lng|longitude', lkey):
            return 'lgt'
        elif re.search('accuracy|radius', lkey) and not re.search('has', lkey):
            return 'accuracy'
        elif re.search('time', lkey):
            return 'timestamp'
        else:
            return None

    def formatDatetime(self, epoch):
        dt = datetime.fromtimestamp(int(epoch)/1000)
        return dt.strftime("%m-%d %H:%M:%S")

    def formatDict(self, d):
        l = []
        for k, v in d.iteritems():
            if isinstance(v, dict): 
                s = ' '.join(['"%s":"%s",' % item for item in v.iteritems()])
                l.append('{' + s[:-1] + '}\n')
            else:
                s = ' '.join(['"%s":"%s",' % item for item in d.iteritems()])
                l.append('{' + s[:-1] + '}\n')
                break
        return l
        
    def outputData(self):
        outfilename = self.logfile.split('.')[0]+'.loc'
        with open(outfilename, 'a') as of:
            for s in self.formatDict(self.pois):
                of.write(s)
            
            for event in self.timeline:
                for s in self.formatDict(event):
                    of.write(s)

"""
            for candidate in self.candidates:
                for s in self.formatDict(candidate):
                    of.write(s)

            for det in self.detections:
                for s in self.formatDict(det):
                    of.write(s)
"""


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print "Usage: python detect.py logfile"
        sys.exit()

    detect = DetectPOI(sys.argv[1])
    detect.getData()
    detect.outputData()
