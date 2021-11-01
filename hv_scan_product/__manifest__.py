# -*- coding: utf-8 -*-
{
    'name': 'Product Scan',
    'version': '1.1',
    'summary': """Product Scan Barcode""",
    'category': 'Localization',
    'description': """Product Scan Barcode""",
    'license': 'AGPL-3',
    'company': 'Havi Technology',
    'author': "Havi Technology",
    'website': "https://havi.com.au",
    'depends': ['base', 'product'],
    'data': [
        'custom_data.xml',
    ],
    'application': True,

    'installable': True,
    'auto_install': False,
    'qweb': [
        "static/src/xml/qweb.xml",
    ],
}
