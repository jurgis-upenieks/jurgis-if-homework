param environmentName string
param location string
param containerRegistryName string
param containerAppsEnvironmentName string
param imageName string
param identityId string

module web '../Homework.Web/generic-configurables/hosting/azure-app.bicep' = {
  name: 'web'
  params: {
    name: 'ca-web-${uniqueString(resourceGroup().id)}'
    location: location
    image: imageName
    environmentName: containerAppsEnvironmentName
    registryName: containerRegistryName
    identityId: identityId
    tags: { 'azd-env-name': environmentName, 'azd-service-name': 'web' }
  }
}

output SERVICE_WEB_URI string = web.outputs.uri
