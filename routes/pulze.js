const express = require("express");
const route = express.Router();

const OpenAI = require("openai");

const UserInterface = require("../models/userInterface");

const weights = {
  quality: 0.8,
  latency: 0,
  weights_cost: "0.3",
  weights_latency: "0.2",
  weights_quality: "0.9",
};

const openai = new OpenAI({
  apiKey: process.env.PULZE_API_KEY,
  baseURL: "https://api.pulze.ai/v1",
  defaultHeaders: { "Pulze-Labels": JSON.stringify(weights) },
  max_tokens: 3900,
  weights: {
    cost: 0.3,
    latency: 0.2,
    quality: 0.9,
  },
  temperature: 0,
  context_window: 100000,
});

function parseCode(response) {
  const codes = [];

  while (true) {
    const start = response.indexOf("```");
    const end = response.lastIndexOf("```");

    if (start === -1 || end === -1 || start >= end) {
      break;
    }

    const block = response.slice(start + 3, end).trim();
    const newlineIndex = block.indexOf("\n");

    if (newlineIndex !== -1) {
      codes.push({
        key: block.slice(0, newlineIndex),
        code: block.slice(newlineIndex + 1),
      });
    } else {
      codes.push({
        key: block,
        code: "",
      });
    }

    response = response.slice(0, start) + response.slice(end + 3);
  }

  return codes
    .map((code) => code.code)
    .join("\n\n")
    .trim();
}

const words = [
  "aerie",
  "alliance",
  "assembly",
  "bale",
  "band",
  "barrel",
  "batch",
  "bed",
  "bevy",
  "board",
  "brood",
  "building",
  "bunch",
  "business",
  "cackle",
  "camp",
  "cast",
  "catch",
  "cauldron",
  "charm",
  "chattering",
  "chime",
  "choir",
  "circle",
  "clan",
  "class",
  "clattering",
  "cloud",
  "clowder",
  "club",
  "cluster",
  "coalition",
  "colony",
  "combination",
  "committee",
  "company",
  "conglomerate",
  "congregation",
  "congress",
  "conspiracy",
  "convocation",
  "corporation",
  "coven",
  "crew",
  "culture",
  "dazzle",
  "descent",
  "doctrine",
  "drift",
  "drove",
  "exaltation",
  "faction",
  "faculty",
  "family",
  "flight",
  "fling",
  "flock",
  "flush",
  "gaggle",
  "galaxy",
  "game",
  "gathering",
  "gobble",
  "group",
  "gulp",
  "herd",
  "hive",
  "intrigue",
  "jury",
  "kettle",
  "kit",
  "knot",
  "labor",
  "lamentation",
  "league",
  "lease",
  "lineup",
  "litter",
  "murmuration",
  "mustering",
  "nest",
  "orchestra",
  "order",
  "organization",
  "ostentation",
  "outfit",
  "pace",
  "pack",
  "pandemonium",
  "parade",
  "parliament",
  "party",
  "phalanx",
  "piteousness",
  "pod",
  "posse",
  "prickle",
  "pride",
  "quiver",
  "raffle",
  "romp",
  "rookery",
  "sawt",
  "school",
  "scoop",
  "scream",
  "scury",
  "sedge",
  "sentence",
  "shadow",
  "shiver",
  "shrewdness",
  "sleuth",
  "sloth",
  "squad",
  "staff",
  "suit",
  "swarm",
  "team",
  "thunder",
  "tower",
  "troop",
  "troupe",
  "trust",
  "unit",
  "venue",
  "whisp",
  "whiting",
  "wisdom",
  "zeal",
];

const getWord = () => {
  const raw = words[Math.floor(Math.random() * Math.floor(words.length))];
  const stylish = raw.charAt(0).toUpperCase() + raw.slice(1);
  return stylish;
};

const updateWords = () => {
  return `${getWord()}-${getWord()}-${getWord()}`;
};

route
  .post("/", async (req, res) => {
    try {
      const prompt = req.body.content;

      const payload = {
        role: "user",
        content: `
        Act as a UI Developer, ${prompt}.

        return a single html output inside triple quote.

        Technology Stack: HTML, CSS, JavaScript, Bootstrap 5
      `,
      };

      const textCompletion = await openai.chat.completions.create({
        messages: [payload],
        model: "openai/gpt-3.5-turbo",
        max_tokens: 4000,
      });

      const {
        choices: [{ message }],
      } = textCompletion;

      console.log(parseCode(message?.content));

      return res.status(200).json({
        ...textCompletion,
        code: parseCode(message?.content),
      });
    } catch (err) {
      console.log(err);
      res.status(500).send({ error: err.message });
    }
  })
  .post("/generator", async (req, res) => {
    try {
      const { prompt, projectId } = req.body;

      const payload = {
        role: "user",
        content: `
          Act as a UI Developer, ${prompt}.
  
          return a single html output inside triple quote.
  
          Technology Stack: HTML, CSS, JavaScript, Bootstrap 5
        `,
      };

      const textCompletion = await openai.chat.completions.create({
        messages: [payload],
        model: "openai/gpt-3.5-turbo",
        max_tokens: 4000,
      });

      const {
        choices: [{ message }],
      } = textCompletion;

      const sourceCode = parseCode(message?.content);

      const userInterfaces = await UserInterface.create({
        projectId: projectId ? projectId : updateWords(),
        sourceCode,
        prompt,
      });

      return res.status(200).json({
        ...userInterfaces.toObject(),
      });
    } catch (err) {
      console.log(err);
      res.status(500).send({ error: err.message });
    }
  })
  .get("/projects", async (req, res) => {
    const projects = await UserInterface.aggregate(
      [
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $group: {
            _id: { projectId: "$projectId" },
            prompt: { $first: "$prompt" },
            sourceCode: { $first: "$sourceCode" },
            projectId: { $first: "$projectId" },
            createdAt: { $first: "$createdAt" },
            id: { $first: "$_id" },
          },
        },
        {
          $project: {
            _id: 0,
            id: 1,
            projectId: 1,
            prompt: 1,
            sourceCode: 1,
            createdAt: 1,
          },
        },
      ],
      { allowDiskUse: true }
    );

    return res.status(200).json(projects);
  })
  .get("/projects/:projectId", async (req, res) => {
    const projects = await UserInterface.find({
      projectId: req.params.projectId,
    });

    return res.status(200).json(projects);
  });

module.exports = route;
