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
	if((l[0] == "右" && l[1] != "剪") || (l[0] == "即" && l[1] == "前") || (l[0] == "即" && l[1] == "桂"))
		return RECIPE_COMMENT;
	return NORMAL_CASE;
};


// Format file
var volumes = [];
var recipes = {};
var currentVolume = -1;
var currentCapter = -1;
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
				volumes[currentVolume].title.capterRange[currentCapter].end = currentIndex+1;
			}
			currentVolume ++;
			volumes[currentVolume] = {
				title: {}
			};
			volumes[currentVolume].items = [];
			volumes[currentVolume].title.capterRange = [];
			volumes[currentVolume].title.capterTitle = [];
			currentCapter = -1;
			currentIndex = -1;
			volumes[currentVolume].title.volumeIndex = currentVolume+1;
			volumes[currentVolume].title.volumeTitle = line;

			break;
		}
		case TITLE:
		{
			if(currentCapter >= 0)
			{
				volumes[currentVolume].title.capterRange[currentCapter].end = currentIndex+1;
			}
			currentCapter ++;
			volumes[currentVolume].title.capterTitle[currentCapter] = line;
			volumes[currentVolume].title.capterRange[currentCapter] = {start: "", end: ""};
			volumes[currentVolume].title.capterRange[currentCapter].start = currentIndex + 1 + 1;
			break;
		}
		case ITEM:
		{
			recipeMode = NORMAL_CASE;
			currentIndex ++;
			currentRecipe = -1;
			volumes[currentVolume].items[currentIndex] = {};
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
			volumes[currentVolume].items[currentIndex].recipe[currentRecipe].herbs = "";
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
					volumes[currentVolume].items[currentIndex].recipe[currentRecipe].herbs += line;
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
				if(volumes[currentVolume].items[currentIndex].recipe[r].herbs.indexOf(target) >= 0)
				{
					found = true;
					//fs.appendFileSync('temp.txt', "\r["+(currentVolume+1)+"."+(currentIndex+1)+"]" + "\r");
					//fs.appendFileSync('temp.txt', volumes[currentVolume].items[currentIndex].recipe[r].herbs + "\r");

					volumes[currentVolume].items[currentIndex].recipe[r].herbs_comment =
						volumes[currentVolume].items[currentIndex].recipe[r].therbs_comment || [];
					var length = volumes[currentVolume].items[currentIndex].recipe[r].herbs_comment.length;
					volumes[currentVolume].items[currentIndex].recipe[r].herbs_comment[length] = {};
					volumes[currentVolume].items[currentIndex].recipe[r].herbs_comment[length].position
						= volumes[currentVolume].items[currentIndex].recipe[r].herbs.indexOf(target);
					volumes[currentVolume].items[currentIndex].recipe[r].herbs_comment[length].comment
						= comment.split(target)[1];
					var texts = volumes[currentVolume].items[currentIndex].recipe[r].herbs.split(target);
					volumes[currentVolume].items[currentIndex].recipe[r].herbs = "";
					for(var each in texts)
					{
						volumes[currentVolume].items[currentIndex].recipe[r].herbs += texts[each];
					}

					//fs.appendFileSync('temp.txt', volumes[currentVolume].items[currentIndex].recipe[r].herbs + "\r");
					//fs.appendFileSync('temp.txt', comment + "\r");
					break;
				}
				if(volumes[currentVolume].items[currentIndex].recipe[r].comment.indexOf(target) >= 0)
				{
					found = true;
					fs.appendFileSync('temp.txt', "\r["+(currentVolume+1)+"."+(currentIndex+1)+"]" + "\r");
					fs.appendFileSync('temp.txt', volumes[currentVolume].items[currentIndex].recipe[r].comment + "\r");

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

					fs.appendFileSync('temp.txt', volumes[currentVolume].items[currentIndex].recipe[r].comment + "\r");
					fs.appendFileSync('temp.txt', comment + "\r");
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
currentVolume = 0;
currentIndex = 0;
currentRecipe = 0;
for(currentVolume in volumes)
{
	for(currentIndex in volumes[currentVolume].items)
	{
		if(volumes[currentVolume].items[currentIndex].recipe)
		{
			for(currentRecipe in volumes[currentVolume].items[currentIndex].recipe)
			{
				var temp = py(volumes[currentVolume].items[currentIndex].recipe[currentRecipe].title, {style: py.STYLE_FIRST_LETTER});
				var titlePY = "";
				// get new title in PY
				for(i in temp)
				{
					titlePY += temp[i];
				}
				// Find a unique name
				var end = 0;
				for(;;)
				{
					var newName = titlePY + end;
					if(!recipes[newName])
					{
						titlePY = newName;
						break;
					}
					console.log(newName);
					end ++;
				}
				recipes[titlePY] = volumes[currentVolume].items[currentIndex].recipe[currentRecipe];
				volumes[currentVolume].items[currentIndex].recipe[currentRecipe] = titlePY;
			}
		}
	}
}
// Write result file
fs.writeFileSync('formatted.txt', JSON.stringify(volumes, null, 2));
fs.writeFileSync('recipes.txt', JSON.stringify(recipes, null, 2));