{{/*
Expand the name of the chart.
*/}}
{{- define "cavalry.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Fully qualified app name.
*/}}
{{- define "cavalry.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "cavalry.labels" -}}
app.kubernetes.io/name: {{ include "cavalry.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end -}}

{{- define "cavalry.secretName" -}}
{{- if .Values.secret.existingSecret -}}
{{ .Values.secret.existingSecret }}
{{- else -}}
{{ include "cavalry.fullname" . }}-secrets
{{- end -}}
{{- end -}}

{{- define "cavalry.image" -}}
{{- $tag := default .root.Values.image.tag .component.image.tag -}}
{{ .root.Values.image.registry }}/{{ .component.image.repository }}:{{ $tag }}
{{- end -}}

{{- define "cavalry.envFromSecret" -}}
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "cavalry.secretName" . }}
      key: DATABASE_URL
- name: BETTER_AUTH_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "cavalry.secretName" . }}
      key: BETTER_AUTH_SECRET
- name: CAVALRY_ENCRYPTION_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "cavalry.secretName" . }}
      key: CAVALRY_ENCRYPTION_KEY
- name: AWS_ACCESS_KEY_ID
  valueFrom:
    secretKeyRef:
      name: {{ include "cavalry.secretName" . }}
      key: AWS_ACCESS_KEY_ID
      optional: true
- name: AWS_SECRET_ACCESS_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "cavalry.secretName" . }}
      key: AWS_SECRET_ACCESS_KEY
      optional: true
{{- range $k := list "CAVALRY_GITHUB_APP_ID" "CAVALRY_GITHUB_APP_PRIVATE_KEY" "CAVALRY_GITHUB_APP_WEBHOOK_SECRET" "CAVALRY_GITHUB_APP_CLIENT_ID" "CAVALRY_GITHUB_APP_CLIENT_SECRET" "CAVALRY_GITHUB_APP_SLUG" "CAVALRY_SLACK_CLIENT_ID" "CAVALRY_SLACK_CLIENT_SECRET" "CAVALRY_SLACK_SIGNING_SECRET" }}
- name: {{ $k }}
  valueFrom:
    secretKeyRef:
      name: {{ include "cavalry.secretName" $ }}
      key: {{ $k }}
      optional: true
{{- end }}
{{- end -}}

{{- define "cavalry.envFromConfig" -}}
- name: CAVALRY_ENV
  value: {{ .Values.config.env | quote }}
- name: CAVALRY_LOG_LEVEL
  value: {{ .Values.config.logLevel | quote }}
- name: CAVALRY_WEB_URL
  value: {{ .Values.config.webUrl | quote }}
- name: CAVALRY_GATEWAY_URL
  value: {{ .Values.config.gatewayUrl | quote }}
- name: BETTER_AUTH_URL
  value: {{ .Values.config.webUrl | quote }}
- name: CAVALRY_STORAGE_PROVIDER
  value: {{ .Values.config.storage.provider | quote }}
- name: CAVALRY_STORAGE_S3_BUCKET
  value: {{ .Values.config.storage.s3Bucket | quote }}
- name: CAVALRY_STORAGE_S3_REGION
  value: {{ .Values.config.storage.s3Region | quote }}
- name: CAVALRY_STORAGE_S3_ENDPOINT
  value: {{ .Values.config.storage.s3Endpoint | quote }}
- name: CAVALRY_SYNC_RECONCILE_INTERVAL_SECONDS
  value: {{ .Values.config.sync.reconcileIntervalSeconds | quote }}
- name: CAVALRY_SYNC_CLONE_MAX_SIZE_MB
  value: {{ .Values.config.sync.cloneMaxSizeMb | quote }}
- name: CAVALRY_SYNC_ARTIFACT_MAX_SIZE_MB
  value: {{ .Values.config.sync.artifactMaxSizeMb | quote }}
- name: CAVALRY_GATEWAY_CACHE_TTL
  value: {{ .Values.config.gateway.cacheTtlSeconds | quote }}
- name: CAVALRY_GATEWAY_MAX_ARTIFACT_SIZE
  value: {{ .Values.config.gateway.maxArtifactSizeBytes | quote }}
{{- end -}}
