from urllib.parse import quote
from django.core.files.storage import FileSystemStorage


class PrivateMediaURLs:
    def url(self, name, *args, **kwargs):
        return '/media/' + quote(name, safe='/')


class PrivateFileSystemStorage(PrivateMediaURLs, FileSystemStorage):
    pass
