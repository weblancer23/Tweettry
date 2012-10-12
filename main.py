from google.appengine.ext import webapp

import jinja2
import os
import cgi
import datetime
import urllib
import webapp2

from google.appengine.ext import db
from google.appengine.api import users

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))


class TeamHandler(webapp2.RequestHandler):
    def get(self):

        template = jinja_environment.get_template('templates/team.html')
        self.response.out.write(template.render())

class MainHandler(webapp2.RequestHandler):
    def get(self):

        template = jinja_environment.get_template('templates/index.html')
        self.response.out.write(template.render())

app = webapp.WSGIApplication([
    ('/home', MainHandler),
    ('/team', TeamHandler)
],debug=True)

