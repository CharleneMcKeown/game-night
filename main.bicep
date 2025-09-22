// main.bicep
// Deploys a Next.js app to Azure App Service

param location string = resourceGroup().location
param appServicePlanName string = 'gameNightPlan'
param webAppName string = 'gameNightWebApp'

resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
    size: 'B1'
    capacity: 1
  }
  kind: 'app'
}

resource webApp 'Microsoft.Web/sites@2022-03-01' = {
  name: webAppName
  location: location
  serverFarmId: appServicePlan.id
  siteConfig: {
    linuxFxVersion: 'NODE|18-lts'
    appSettings: [
      {
        name: 'WEBSITE_NODE_DEFAULT_VERSION'
        value: '18.17.1'
      }
      {
        name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
        value: 'true'
      }
    ]
  }
  kind: 'app,linux'
}

output webAppUrl string = webApp.defaultHostName
