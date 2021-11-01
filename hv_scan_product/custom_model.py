# -*- coding: utf-8 -*-
import threading
import base64
import itertools
import unicodedata
import chardet
import io
import operator
import logging
_logger = logging.getLogger(__name__)

from datetime import datetime, date, timedelta
from itertools import groupby
from odoo.exceptions import UserError, ValidationError
from odoo import api, exceptions, fields, models, _, tools, registry
from odoo.tools.mimetypes import guess_mimetype
from odoo.tools import config, DEFAULT_SERVER_DATE_FORMAT, DEFAULT_SERVER_DATETIME_FORMAT, pycompat, float_round
from odoo import http
from odoo.http import request


class HrAttendance(http.Controller):
    @http.route('/hv_scan_product/kiosk_keepalive', auth='user', type='json')
    def kiosk_keepalive(self):
        request.httprequest.session.modified = True
        return {}

    @http.route('/get/message', auth='user', type='json')
    def get_message(self):
        notify_error = request.env['ir.config_parameter'].sudo().get_param('hv_scan_product.notify_error')
        return {
            'notify_error': notify_error
        }

class Product_template(models.Model):
    _inherit = "product.template"

    def barcode_seach(self, barcode):
        return

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    notify_error = fields.Char("Error message",
                               help="Will be sent to the customer when the product is not found")

    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()

        res['notify_error'] = self.env['ir.config_parameter'].sudo().get_param('hv_scan_product.notify_error', default="Could not found product, please contact store manager!")
        return res

    @api.model
    def set_values(self):
        self.env['ir.config_parameter'].sudo().set_param('hv_scan_product.notify_error', self.notify_error)

        super(ResConfigSettings, self).set_values()