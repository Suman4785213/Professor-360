from storages.backends.s3 import S3Storage
from .storage import PrivateMediaURLs


class PrivateS3Storage(PrivateMediaURLs, S3Storage):
    default_acl = None
    querystring_auth = True
