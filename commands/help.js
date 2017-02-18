const {Command} = require('heroku-cli-command')
const util = require('../lib/util')
const config = require('../lib/config')

class Help extends Command {
  async run () {
    const argv0 = config.bin
    let cmd = this.args.find(arg => !['help', '-h', '--help'].includes(arg))
    if (!cmd) return this.topics({argv0})
    let topicName = cmd.split(':')[0]
    let topic = this.plugins.topics[topicName]
    let matchedCommand = this.plugins.commands[cmd]
    if (!topic && !matchedCommand) throw new Error(`command ${cmd} not found`)
    if (!topic) topic = {name: topicName, fetch: () => { }}
    let Topic = topic.fetch()
    let commands = this.commandsForTopic(topicName)
    commands.sort(util.compare('command'))
    if (typeof Topic !== 'function') {
      Topic = class extends require('heroku-cli-command').Topic {}
      Topic.topic = topic.topic
      Topic.description = topic.description
    }
    topic = new Topic({flags: this.flags})
    await topic.help({commands, args: this.args, matchedCommand, argv0})
  }

  get plugins () {
    return require('../lib/plugins')
  }

  commandsForTopic (topic) {
    let plugins = this.plugins.list()
    let commands = []
    for (let plugin of plugins) {
      commands = commands.concat(plugin.commands.filter(c => c.topic === topic))
    }
    return commands
  }

  topics ({argv0}) {
    const max = require('lodash.maxby')
    const S = require('string')

    this.log(`Usage: ${argv0} COMMAND [--app APP] [command-specific-options]

  Help topics, type ${this.color.cmd(argv0 + ' help TOPIC')} for more details:
  `)
    let topics = Object.keys(this.plugins.topics).map(t => this.plugins.topics[t])
    topics = topics.filter(t => !t.hidden)
    topics.sort(util.compare('topic'))
    let maxlength = max(topics, 'topic.length').topic.length
    for (let topic of topics) {
      this.log(`  ${argv0} ${S(topic.topic).padRight(maxlength)}${topic.description ? ' # ' + topic.description : ''}`)
    }

    this.log()
  }
}

Help.topic = 'help'
Help.description = 'display help'
Help.variableArgs = true

module.exports = Help
