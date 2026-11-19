"""Read-only route/serializer inventory. Does not query application records."""
import os, inspect, ast, textwrap, importlib
from pathlib import Path
os.environ['DEBUG'] = 'False'
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.test'
from django.conf import settings
settings.DATABASES['default'].update(NAME='contract_inspection_only', HOST='127.0.0.1', PORT='1')
import django
django.setup()
from rest_framework.schemas.generators import EndpointEnumerator
from rest_framework import serializers
apps = ['accounts', 'activities', 'verification', 'evidence', 'reports', 'notifications', 'analytics']
lines = ['## Source-derived endpoint and schema reference', '',
 'Generated from registered URL callbacks and serializer fields without database reads. Paths below use canonical /api/v1/. HEAD/OPTIONS are omitted. Request expressions preserve actual defaults; response expressions identify exact JSON keys or the serializer/service returning them. Model foreign keys are UUIDs. SerializerMethodField values are defined in the linked source. Common status/error/pagination rules above apply.', '']
seen=set()
for path, method, callback in EndpointEnumerator().get_api_endpoints():
    if not path.startswith('/api/v1/') or '.{format}' in path: continue
    cls = callback.cls
    if not any(cls.__module__.startswith('apps.'+app+'.') for app in apps) and path != '/api/v1/colleges/public/': continue
    if '/users/' in path or '/automation-rules/' in path: continue
    action = getattr(callback, 'actions', {}).get(method.lower(), method.lower())
    fn = getattr(cls, action, None)
    if not fn: continue
    key=(path,method)
    if key in seen: continue
    seen.add(key)
    source=textwrap.dedent(inspect.getsource(inspect.unwrap(fn)))
    tree=ast.parse(source)
    params=[]; responses=[]
    for node in ast.walk(tree):
        if isinstance(node,ast.Call):
            expression=ast.unparse(node)
            if expression.startswith(('request.data.get(', 'request.query_params.get(', 'request.FILES.get(')):
                params.append(expression)
            if isinstance(node.func,ast.Name) and node.func.id in ('Response','FileResponse','HttpResponse'):
                responses.append(expression)
    serializer=getattr(cls,'serializer_class',None)
    perms=getattr(fn,'kwargs',{}).get('permission_classes',getattr(cls,'permission_classes',[]))
    lines += [f'### {method} {path}', '',
              f'Handler: `{cls.__module__}.{cls.__name__}.{action}`. Base permissions: '+', '.join(p.__name__ for p in perms)+'. Apply role/scope rules above and source guards below.',
              'Serializer: '+(serializer.__name__ if serializer else 'dynamic/custom; see response and source guard reference')+'.',
              'Inputs: '+('; '.join('`'+p+'`' for p in dict.fromkeys(params)) or 'serializer fields / URL identifier; no additional request.get parameters')+'.',
              'Response construction:', '```python', '\n'.join(dict.fromkeys(responses)) or ('Standard DRF '+action+' response using the serializer.'), '```', '']
lines += ['## Serializer field schemas', '','Required means required on create/full update; PATCH permits omitted fields. Read-only fields are response-only; write-only fields are request-only. Nested serializers use their named schema. Choice values are listed.', '']
for app in apps:
    module=importlib.import_module('apps.'+app+'.serializers')
    for name, cls in vars(module).items():
        if not inspect.isclass(cls) or cls.__module__ != module.__name__ or not issubclass(cls,serializers.BaseSerializer): continue
        try: fields=cls().fields
        except Exception: continue
        lines += ['### '+name,'','| Field | Type | Required | Read only | Nullable | Choices |','| --- | --- | --- | --- | --- | --- |']
        for name, field in fields.items():
            choices = ', '.join(str(x) for x in (field.choices if isinstance(field, serializers.ChoiceField) else {}))
            lines += [f'| {name} | {type(field).__name__} | {field.required} | {field.read_only} | {field.allow_null} | {choices} |']
        lines += ['']
lines += ['## Authorization and custom response source references', '',
 'These extracts supply dynamic role guards, filtering, service-returned payloads and upload validation beyond the route table. They are source references, not example response data.', '']
for app in apps:
    for filename in ('views.py','serializers.py','services.py'):
        path=Path(__file__).parent/'apps'/app/filename
        if not path.exists(): continue
        source=path.read_text(encoding='utf-8'); tree=ast.parse(source)
        for cls in tree.body:
            if not isinstance(cls,ast.ClassDef): continue
            for fn in cls.body:
                if not isinstance(fn,ast.FunctionDef): continue
                if (filename == 'services.py' and app == 'analytics') or (filename == 'serializers.py' and fn.name.startswith('get_')) or fn.name in ('get_queryset','get_permissions','get_serializer_class','validate','validate_file','perform_create','perform_update'):
                    lines += [f'### {app}/{filename}: {cls.name}.{fn.name}', '```python',ast.get_source_segment(source,fn),'```','']
Path(__file__).parent.parent.joinpath('docs/PHASE2_MOBILE_API_REFERENCE.md').write_text('\n'.join(lines),encoding='utf-8')
print(f'Exported {len(seen)} method/path contracts with serializer schemas; no database connection used.')
