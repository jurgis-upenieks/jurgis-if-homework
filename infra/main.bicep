targetScope = 'subscription'

@minLength(1)
@maxLength(40)
param environmentName string
param location string

resource group 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-homework-${environmentName}'
  location: location
  tags: { 'azd-env-name': environmentName }
}

module hosting '../Homework.Web/generic-configurables/hosting/azure-environment.bicep' = {
  name: 'hosting'
  scope: group
  params: { tags: group.tags }
}

output AZURE_RESOURCE_GROUP string = group.name
output AZURE_CONTAINER_REGISTRY_NAME string = hosting.outputs.registryName
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = hosting.outputs.registryEndpoint
output AZURE_CONTAINER_ENVIRONMENT_NAME string = hosting.outputs.environmentName
output SERVICE_WEB_IDENTITY_ID string = hosting.outputs.identityId
