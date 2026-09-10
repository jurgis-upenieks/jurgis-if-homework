param name string
param image string
param environmentName string
param registryName string
param identityId string
param location string = resourceGroup().location
param tags object = {}
param port int = 3000
param healthPath string = '/health'

resource environment 'Microsoft.App/managedEnvironments@2025-07-01' existing = {
  name: environmentName
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: registryName
}

resource app 'Microsoft.App/containerApps@2025-07-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identityId}': {} }
  }
  properties: {
    environmentId: environment.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        allowInsecure: false
        targetPort: port
        transport: 'http'
      }
      registries: [{ server: registry.properties.loginServer, identity: identityId }]
    }
    template: {
      containers: [{
        name: 'app'
        image: image
        env: [{ name: 'PORT', value: string(port) }]
        resources: { cpu: json('0.5'), memory: '1Gi' }
        probes: [
          {
            type: 'Startup'
            httpGet: { path: healthPath, port: port, scheme: 'HTTP' }
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 30
          }
          {
            type: 'Readiness'
            httpGet: { path: healthPath, port: port, scheme: 'HTTP' }
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
          }
          {
            type: 'Liveness'
            httpGet: { path: healthPath, port: port, scheme: 'HTTP' }
            periodSeconds: 30
            timeoutSeconds: 2
            failureThreshold: 3
          }
        ]
      }]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}

output uri string = 'https://${app.properties.configuration.ingress.fqdn}'
