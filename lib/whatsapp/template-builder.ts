export interface TemplateParams {
  body: string[]
  headerText?: string
  headerMediaUrl?: string
  buttonParams?: Record<string, string>
}

export function buildTemplateComponents(
  bodyText: string,
  params: TemplateParams
): any[] {
  const components: any[] = []

  if (params.headerMediaUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: { link: params.headerMediaUrl } }]
    })
  } else if (params.headerText) {
    components.push({
      type: 'header',
      parameters: [{ type: 'text', text: params.headerText }]
    })
  }

  components.push({
    type: 'body',
    parameters: params.body.map(value => ({ type: 'text', text: value }))
  })

  if (params.buttonParams && Object.keys(params.buttonParams).length > 0) {
    const buttonParams: any[] = []
    const entries = Object.entries(params.buttonParams)
    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i]
      const index = parseInt(key)
      buttonParams.push({
        type: 'button',
        index,
        sub_type: 'url',
        parameters: [{ type: 'text', text: value }]
      })
    }
    if (buttonParams.length > 0) {
      components.push({ type: 'button', sub_type: 'url', index: 0, parameters: buttonParams })
    }
  }

  return components
}
