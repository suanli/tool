var fs = require('fs');
var py = require('pinyin');
var file = fs.readFileSync("original.txt", "utf8");
if(fs.existsSync('preformat.txt'))
	fs.unlinkSync('preformat.txt');
if(fs.existsSync('comments.txt'))
	fs.unlinkSync('comments.txt');
if(fs.existsSync('temp.txt'))
	fs.unlinkSync('temp.txt');
var lines = file.split("\r");

// Pre format file
for(var index in lines){
	var line = lines[index];
	if(line[0] == '·')
		continue;
	if(line[0] == '☯')
		continue;
	if(line[0] == '-')
		continue;
	if(line[0] == "\r")
		continue;
	if(line.length == 0)
		continue;
	if((line[0] == '①' ||
		line[0] == '②' ||
		line[0] == '③' ||
		line[0] == '④' ||
		line[0] == '⑤' ||
		line[0] == '⑥' ||
		line[0] == '⑦' ||
		line[0] == '⑧') && line[1]
		){
		fs.appendFileSync('comments.txt', line+'\r');
		continue;
	}
	fs.appendFileSync('preformat.txt', line+'\r');
}

var NORMAL_CASE = 1;
var TITLE = 2;
var VOL = 3;
var RECIPE = 4;
var RECIPE_COMMENT = 5;
var ITEM = 6;
var EMPTY = 7;



var getType = function (l){
	if(l[0] == "辨")
		return TITLE;
	if(l[l.length-1] == "一" ||
		l[l.length-1] == "二" ||
		l[l.length-1] == "三" ||
		l[l.length-1] == "四" ||
		l[l.length-1] == "五" ||
		l[l.length-1] == "六" ||
		l[l.length-1] == "七" ||
		l[l.length-1] == "八" ||
		l[l.length-1] == "九" ||
		l[l.length-1] == "十")
	{
		if(l[l.length-2] == "第" || l[l.length-3] == "第")
		{
			if(l[0] = "傷" && l[2] == "雜")
				return VOL;
			return TITLE;
		}
	}
	if(l[l.length-1] == "方" && l.length < 20)
		return RECIPE;
	if(l[0] == "【")
		return ITEM;
	if(l[0] == '\n' || l[0] == '\r')
		return EMPTY;
	if((l[0] == "右" ) ||
		(l[0] == "即" && l[1] == "前") ||
		(l[0] == "即" && l[1] == "桂") ||
		(l[0] == "即" && l[1] == "白") ||
		(l[0] == "（" && l[1] == "麻"))
		return RECIPE_COMMENT;
	return NORMAL_CASE;
};


// Format file
var volumes = [];
var recipes = {};
var currentVolume = -1;
var currentchapter = -1;
var currentIndex = -1;
var recipeMode = 0;
var currentRecipe = -1;
file = fs.readFileSync("preformat.txt", "utf8");
lines = file.split("\r");
for(var i =0; i < lines.length; i++)
{
	line = lines[i];
	switch(getType(line)){
		case VOL:
		{
			if(currentVolume >= 0)
			{
				volumes[currentVolume].title.chapterRange[currentchapter].end = currentIndex+1;
			}
			currentVolume ++;
			volumes[currentVolume] = {
				title: {}
			};
			volumes[currentVolume].items = [];
			volumes[currentVolume].title.chapterRange = [];
			volumes[currentVolume].title.chapterTitle = [];
			currentchapter = -1;
			currentIndex = -1;
			volumes[currentVolume].title.volumeIndex = currentVolume+1;
			volumes[currentVolume].title.volumeTitle = line;

			break;
		}
		case TITLE:
		{
			if(currentchapter >= 0)
			{
				volumes[currentVolume].title.chapterRange[currentchapter].end = currentIndex+1;
			}
			currentchapter ++;
			volumes[currentVolume].title.chapterTitle[currentchapter] = line;
			volumes[currentVolume].title.chapterRange[currentchapter] = {start: "", end: ""};
			volumes[currentVolume].title.chapterRange[currentchapter].start = currentIndex + 1 + 1;
			break;
		}
		case ITEM:
		{
			recipeMode = NORMAL_CASE;
			currentIndex ++;
			currentRecipe = -1;
			volumes[currentVolume].items[currentIndex] = {};
			volumes[currentVolume].items[currentIndex].vol = currentVolume+1;
			volumes[currentVolume].items[currentIndex].chapter = currentchapter+1;
			volumes[currentVolume].items[currentIndex].index = currentIndex+1;
			var temp = line.split("】");
			volumes[currentVolume].items[currentIndex].text = temp[1];
			break;
		}
		case RECIPE:
		{
			recipeMode = RECIPE;
			currentRecipe ++;
			volumes[currentVolume].items[currentIndex].recipe =
				volumes[currentVolume].items[currentIndex].recipe || [];
			volumes[currentVolume].items[currentIndex].recipe[currentRecipe] = {};
			volumes[currentVolume].items[currentIndex].recipe[currentRecipe].title = line;
			volumes[currentVolume].items[currentIndex].recipe[currentRecipe].herbText = "";
			volumes[currentVolume].items[currentIndex].recipe[currentRecipe].comment = "";
			break;
		}
		case NORMAL_CASE:
		{
			if(i == 0)
				break;
			switch(recipeMode)
			{
				case NORMAL_CASE:
					volumes[currentVolume].items[currentIndex].text += line;
					break;
				case RECIPE:
					volumes[currentVolume].items[currentIndex].recipe[currentRecipe].herbText += line;
					break;
				case RECIPE_COMMENT:
						volumes[currentVolume].items[currentIndex].recipe[currentRecipe].comment += line;
					break;

			}
			break;
		}
		case RECIPE_COMMENT:
		{
			recipeMode = RECIPE_COMMENT;
			volumes[currentVolume].items[currentIndex].recipe[currentRecipe].comment += line;
			break;
		}

	}
}
if(currentVolume >= 0)
{
	volumes[currentVolume].title.chapterRange[currentchapter].end = currentIndex+1;
}

//Process comments
var comments = fs.readFileSync("comments.txt", "utf8");
comments = comments.split("\r");
currentVolume = 0;
currentIndex = 0;
currentRecipe = 0;
var preTarget = {};
for(i in comments)
{

	var comment = comments[i];
	var target = comment[0];
	if(preTarget == target)
		currentIndex ++;
	for(;;)
	{
		if (!volumes[currentVolume].items[currentIndex]) {
			currentVolume++;
			currentIndex = 0;
		}
		if (!volumes[currentVolume])
			break;
		if (volumes[currentVolume].items[currentIndex].text.indexOf(target) >= 0) {
			//fs.appendFileSync('temp.txt', "\r["+(currentVolume+1)+"."+(currentIndex+1)+"]" + "\r");
			//fs.appendFileSync('temp.txt', volumes[currentVolume].items[currentIndex].text + "\r");
			// add comment to items, remove book marker
			volumes[currentVolume].items[currentIndex].text_comment =
				volumes[currentVolume].items[currentIndex].text_comment || [];
			var length = volumes[currentVolume].items[currentIndex].text_comment.length;
			volumes[currentVolume].items[currentIndex].text_comment[length] = {};
			volumes[currentVolume].items[currentIndex].text_comment[length].position = volumes[currentVolume].items[currentIndex].text.indexOf(target);
			volumes[currentVolume].items[currentIndex].text_comment[length].comment = comment.split(target)[1];
			var texts = volumes[currentVolume].items[currentIndex].text.split(target);
			volumes[currentVolume].items[currentIndex].text = "";
			for(var each in texts)
			{
				volumes[currentVolume].items[currentIndex].text += texts[each];
			}

			//fs.appendFileSync('temp.txt', volumes[currentVolume].items[currentIndex].text + "\r");
			//fs.appendFileSync('temp.txt', comment + "\r");


			break;
		}
		var found = false;
		if(volumes[currentVolume].items[currentIndex].recipe)
		{
			for(var r in volumes[currentVolume].items[currentIndex].recipe)
			{
				if(volumes[currentVolume].items[currentIndex].recipe[r].title.indexOf(target) >= 0)
				{
					found = true;
					//fs.appendFileSync('temp.txt', "\r["+(currentVolume+1)+"."+(currentIndex+1)+"]" + "\r");
					//fs.appendFileSync('temp.txt', volumes[currentVolume].items[currentIndex].recipe[r].title + "\r");

					volumes[currentVolume].items[currentIndex].recipe[r].title_comment =
						volumes[currentVolume].items[currentIndex].recipe[r].title_comment || [];
					var length = volumes[currentVolume].items[currentIndex].recipe[r].title_comment.length;
					volumes[currentVolume].items[currentIndex].recipe[r].title_comment[length] = {};
					volumes[currentVolume].items[currentIndex].recipe[r].title_comment[length].position
						= volumes[currentVolume].items[currentIndex].recipe[r].title.indexOf(target);
					volumes[currentVolume].items[currentIndex].recipe[r].title_comment[length].comment
						= comment.split(target)[1];
					var texts = volumes[currentVolume].items[currentIndex].recipe[r].title.split(target);
					volumes[currentVolume].items[currentIndex].recipe[r].title = "";
					for(var each in texts)
					{
						volumes[currentVolume].items[currentIndex].recipe[r].title += texts[each];
					}

					//fs.appendFileSync('temp.txt', volumes[currentVolume].items[currentIndex].recipe[r].title + "\r");
					//fs.appendFileSync('temp.txt', comment + "\r");
					break;
				}
				if(volumes[currentVolume].items[currentIndex].recipe[r].herbText.indexOf(target) >= 0)
				{
					found = true;
					//fs.appendFileSync('temp.txt', "\r["+(currentVolume+1)+"."+(currentIndex+1)+"]" + "\r");
					//fs.appendFileSync('temp.txt', volumes[currentVolume].items[currentIndex].recipe[r].herbs + "\r");

					volumes[currentVolume].items[currentIndex].recipe[r].herbs_comment =
						volumes[currentVolume].items[currentIndex].recipe[r].herbs_comment || [];
					var length = volumes[currentVolume].items[currentIndex].recipe[r].herbs_comment.length;
					volumes[currentVolume].items[currentIndex].recipe[r].herbs_comment[length] = {};
					volumes[currentVolume].items[currentIndex].recipe[r].herbs_comment[length].position
						= volumes[currentVolume].items[currentIndex].recipe[r].herbText.indexOf(target);
					volumes[currentVolume].items[currentIndex].recipe[r].herbs_comment[length].comment
						= comment.split(target)[1];
					var texts = volumes[currentVolume].items[currentIndex].recipe[r].herbText.split(target);
					volumes[currentVolume].items[currentIndex].recipe[r].herbText = "";
					for(var each in texts)
					{
						volumes[currentVolume].items[currentIndex].recipe[r].herbText += texts[each];
					}

					//fs.appendFileSync('temp.txt', volumes[currentVolume].items[currentIndex].recipe[r].herbs + "\r");
					//fs.appendFileSync('temp.txt', comment + "\r");
					break;
				}
				if(volumes[currentVolume].items[currentIndex].recipe[r].comment.indexOf(target) >= 0)
				{
					found = true;
					//fs.appendFileSync('temp.txt', "\r["+(currentVolume+1)+"."+(currentIndex+1)+"]" + "\r");
					//fs.appendFileSync('temp.txt', volumes[currentVolume].items[currentIndex].recipe[r].comment + "\r");

					volumes[currentVolume].items[currentIndex].recipe[r].comment_comment =
						volumes[currentVolume].items[currentIndex].recipe[r].comment_comment || [];
					var length = volumes[currentVolume].items[currentIndex].recipe[r].comment_comment.length;
					volumes[currentVolume].items[currentIndex].recipe[r].comment_comment[length] = {};
					volumes[currentVolume].items[currentIndex].recipe[r].comment_comment[length].position
						= volumes[currentVolume].items[currentIndex].recipe[r].comment.indexOf(target);
					volumes[currentVolume].items[currentIndex].recipe[r].comment_comment[length].comment
						= comment.split(target)[1];
					var texts = volumes[currentVolume].items[currentIndex].recipe[r].comment.split(target);
					volumes[currentVolume].items[currentIndex].recipe[r].comment = "";
					for(var each in texts)
					{
						volumes[currentVolume].items[currentIndex].recipe[r].comment += texts[each];
					}

					//fs.appendFileSync('temp.txt', volumes[currentVolume].items[currentIndex].recipe[r].comment + "\r");
					//fs.appendFileSync('temp.txt', comment + "\r");
					break;
				}
			}
		}
		if(found)
			break;
		currentIndex++;
	}
	preTarget = target;
	if(!volumes[currentVolume])
		break;
}

// split recipes from items
var getPY = function (str){
	var temp = py(str, { style: py.STYLE_NORMAL});
	var name = "";
	for(var j in temp)
	{
		name += temp[j];
	}
	return name;
}
var getSPY = function (str){
	var temp = py(str, { style: py.STYLE_FIRST_LETTER});
	var name = "";
	for(var j in temp)
	{
		name += temp[j];
	}
	return name;
}
var getUniqueRecipeName = function (name)
{
	var end = 0;
	for(;;)
	{
		var newName = name + end;
		if(!recipes[newName])
		{
			return newName;
			break;
		}
		end ++;
	}
}
for(currentVolume in volumes)
{
	for(currentIndex in volumes[currentVolume].items)
	{
		if(volumes[currentVolume].items[currentIndex].recipe)
		{
			for(currentRecipe in volumes[currentVolume].items[currentIndex].recipe)
			{
				var titlePY = getUniqueRecipeName(
					getSPY(volumes[currentVolume].items[currentIndex].recipe[currentRecipe].title));
				recipes[titlePY] = volumes[currentVolume].items[currentIndex].recipe[currentRecipe];
				volumes[currentVolume].items[currentIndex].recipe[currentRecipe] = titlePY;
			}
		}
	}
}

// Write result file
fs.writeFileSync('formatted.txt', JSON.stringify(volumes, null, 2));

// collect herbs from recipes
var herbs = {};
var startOfWeight = function (str){
	if(str[0] == "一" ||
		str[0] == "二" ||
		str[0] == "三" ||
		str[0] == "四" ||
		(str[0] == "五" && str[1] != "味") ||
		str[0] == "六" ||
		str[0] == "七" ||
		str[0] == "八" ||
		str[0] == "九" ||
		str[0] == "十" ||
		(str[0] == "百" && str[1] != "合") ||
		str[0] == "兩" ||
		str[0] == "少")
		return true;
	if((str[0] == "半" && str[1] != "夏") ||
		(str[0] == "雞" && str[1] == "子" && str[2] == "大") ||
		(str[0] == "如" && str[1] == "指") ||
		(str[0] == "如" && str[1] == "雞"))
		return true;
	return false;
}
var isUnit = function (singleChar){
	if(singleChar == "兩" ||
		singleChar == "枚" ||
		singleChar == "升" ||
		singleChar == "片" ||
		singleChar == "合" ||
		singleChar == "斤" ||
		singleChar == "個" ||
		singleChar == "粒" ||
		singleChar == "斗" ||
		singleChar == "分" ||
		singleChar == "銖" ||
		singleChar == "把" ||
		singleChar == "錢" ||
		singleChar == "莖" ||
		singleChar == "許" ||
		singleChar == "大" ||
		singleChar == "只" ||
		singleChar == "許" ||
		singleChar == "匙")
		return true;
	return false;
}
var findEndOfUnit = function (str){
	if(!startOfWeight(str))
		return -1;
	for(var n = 0; n < str.length; n ++){
		//console.log(i);
		if(isUnit(str[n])){
			if(str[n+1] == "半" && str[n+2] != "夏")
				return n+2;
			if(str[n] == "錢" && str[n+1] == "匙")
				return n+2;
			return n+1;
		}
	}
	return str.length + 1;
}

var startOfComment = function (str){
	if(str[0] == "（" ||
		str[0] == "碎")
		return true;
	if((str[0] == "熬" && str[1] == "令"))
		return true;
	if((str[0] == "去" && str[1] == "目"))
		return true;
	if((str[0] == "大" && str[1] == "者"))
		return true;
	return false;
}

var findEndOfComment = function (str){
	if(!startOfComment(str))
		return -1;
	for(var m = 0; m < str.length; m ++){
		if(str[m] == "）"){
			if(str[m+1] == "碎")
				return m+2;
			return m+1;
		}
		if((str[m] == "黃" && str[m+1] == "色") ||
			(str[m] == "目" && str[m+1] == "汗" && str[m+2] != "）") ||
			(str[m] == "大" && str[m+1] == "者"))
			return m+2;
	}
	return str.length + 1;
}

//split and build herbs
var combinRecipe = function (recipe){
	var ret = "";
	for(var i in recipe){
		ret += herbs[recipe[i].herb];
		if(recipe[i].weight_prefix)
			ret += recipe[i].weight_prefix;
		if(recipe[i].weight)
			ret += weights[recipe[i].weight];
		if(recipe[i].weight_postfix)
			ret += recipe[i].weight_postfix;
		if(recipe[i].comment)
			ret += recipe[i].comment;
	}
	return ret;
}

// TODO: items with "各" "等分" and items without weight
// TODO: comments?
var herbInPY;
var weightInPY;
var weights = {};
for(i in recipes)
{
	if(recipes[i].herbText == "")
		continue;
	// bypass "各"
	if(recipes[i].herbText.indexOf('各') >= 0 ||
		recipes[i].herbText.indexOf('等分') >= 0)
	{
		console.log(recipes[i].herbText);
		continue;
	}
	var herbStr = recipes[i].herbText;
	var herbName = "";
	var herbsIndex = -1;
	var foundWeight = false;
	for(j = 0; j < herbStr.length; j++)
	{
		if(startOfWeight(herbStr.slice(j)))
		{
			foundWeight = true;
			if(herbName != ""){
				// OK, found herbs, build herbs list
				herbInPY = getPY(herbName);
				if(!herbs[herbInPY])
					herbs[herbInPY] = herbName;
				recipes[i].herbs = recipes[i].herbs || [];
				if(herbsIndex == -1 || recipes[i].herbs[herbsIndex].herb)
				{
					herbsIndex ++;
					recipes[i].herbs[herbsIndex] = {};
					recipes[i].herbs[herbsIndex].herb = herbInPY;
				}
			}
			var q = j;
			j+=findEndOfUnit(herbStr.slice(j)) -1;
			recipes[i].herbs[herbsIndex].weight = recipes[i].herbs[herbsIndex].weight || "";
			recipes[i].herbs[herbsIndex].weight += herbStr.slice(q, j+1);
			herbName = "";
			continue;
		}
		if(startOfComment(herbStr.slice(j)))
		{
			var q = j;
			j+=findEndOfComment(herbStr.slice(j)) -1;

			recipes[i].herbs = recipes[i].herbs || [];
			if(herbsIndex == -1 || herbName != "")
			{
				herbInPY = getPY(herbName);
				if(!herbs[herbInPY])
					herbs[herbInPY] = herbName;
				herbsIndex ++;
				recipes[i].herbs[herbsIndex] = {};
				recipes[i].herbs[herbsIndex].herb = herbInPY;
				recipes[i].herbs[herbsIndex].weight_prefix = herbStr.slice(q, j+1);
			}
			else
			{
				if(recipes[i].herbs[herbsIndex].comment)
				{
					recipes[i].herbs[herbsIndex].weight_postfix = recipes[i].herbs[herbsIndex].comment;
					recipes[i].herbs[herbsIndex].comment = herbStr.slice(q, j+1);
				}
				else
					recipes[i].herbs[herbsIndex].comment = herbStr.slice(q, j+1);

			}
			herbName = "";
			continue;
		}
		herbName += herbStr[j];
	}
	if(!foundWeight)
	{
		delete recipes[i].herbs;
		console.log(recipes[i].herbText);
		continue;
	}
	for(j in recipes[i].herbs)
	{
		weightInPY = getPY(recipes[i].herbs[j].weight);
		if(!weights[weightInPY])
			weights[weightInPY] = recipes[i].herbs[j].weight;
		recipes[i].herbs[j].weight = weightInPY;
	}
	// Combind and compare the results.
	var combin = combinRecipe(recipes[i].herbs);
	if(combin != recipes[i].herbText)
	{
		console.log(combin);
		console.log(recipes[i].herbText);
	}
}

fs.writeFileSync('recipes.txt', JSON.stringify(recipes, null, 2));
fs.writeFileSync('herbs.txt', JSON.stringify(herbs, null, 2));
fs.writeFileSync('weights.txt', JSON.stringify(weights, null, 2));


// write final result
if(fs.existsSync("out"))
{
	fs.rmdirSync("out");
}
fs.mkdirSync("out");
var content = [];
for(currentVolume in volumes)
{
	var path = "out/vol"+(parseInt(currentVolume)+1);
	fs.mkdirSync(path);
	fs.writeFileSync(path+"/title.json", JSON.stringify(volumes[currentVolume].title, null, 2));
    content[currentVolume] = volumes[currentVolume].title;
	for(currentIndex in volumes[currentVolume].items)
	{
		fs.writeFileSync(path+"/"+(parseInt(currentIndex)+1)+".json", JSON.stringify(volumes[currentVolume].items[currentIndex], null, 2));
	}
}

fs.writeFileSync("out/content.json", JSON.stringify(content, null, 2));


fs.mkdirSync("out/recipe");
for(currentRecipe in recipes)
{
	fs.writeFileSync("out/recipe/"+currentRecipe+".json", JSON.stringify(recipes[currentRecipe], null, 2));
}

// Output backend seed data format
var seedData = {};
var otherContent = [];
var volIndex = 0;
for(curr in content)
{
	otherContent[otherContent.length] = {};
	otherContent[otherContent.length-1].volumeIndex = ++volIndex;
	otherContent[otherContent.length-1].chapterIndex = 0;
	otherContent[otherContent.length-1].title = content[curr].volumeTitle;
	var chapterIndex = 1;
	for(chapter in content[curr].chapterTitle)
	{
		otherContent[otherContent.length] = {};
		otherContent[otherContent.length-1].vol = volIndex;
		otherContent[otherContent.length-1].chapter = chapterIndex++;
		otherContent[otherContent.length-1].title = content[curr].chapterTitle[chapter];
	}
}

var otherText = [];
for(currentVolume in volumes)
{
	content[currentVolume] = volumes[currentVolume].title;
	for(currentIndex in volumes[currentVolume].items)
	{
		otherText[otherText.length] = {};
		otherText[otherText.length-1].vol = volumes[currentVolume].items[currentIndex].vol;
		otherText[otherText.length-1].chapter = volumes[currentVolume].items[currentIndex].chapter;
		otherText[otherText.length-1].index = volumes[currentVolume].items[currentIndex].index;
		otherText[otherText.length-1].text = volumes[currentVolume].items[currentIndex].text;
		if(volumes[currentVolume].items[currentIndex].text_comment)
		{
			otherText[otherText.length-1].text_comment =
				JSON.stringify(volumes[currentVolume].items[currentIndex].text_comment);
		}
		if(volumes[currentVolume].items[currentIndex].recipe)
		{
			otherText[otherText.length-1].recipe =
				JSON.stringify(volumes[currentVolume].items[currentIndex].recipe);
		}
	}
}

seedData.ContentModel = otherContent;
seedData.TextModel = otherText;

fs.writeFileSync("out/seedData.json", JSON.stringify(seedData, null, 2));
//TODO:
// comments in recipes
// some recipes not formatted yet.