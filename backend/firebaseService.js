// backend/firebaseService.js

// Ovaj file sadrži funkcije koje obavljaju "backend" poslove (komunikacija s bazom)

export async function saveTaskToDB(userId, taskData) {
  const taskRef = firebase.database().ref("tasks").push();
  await taskRef.set({
    id: taskRef.key,
    userId,
    completed: false,
    ...taskData,
  });
  return taskRef.key;
}

export async function deleteTaskFromDB(taskId) {
  return firebase.database().ref(`tasks/${taskId}`).remove();
}

export async function updateTaskInDB(taskId, updatedData) {
  return firebase.database().ref(`tasks/${taskId}`).update(updatedData);
}

export async function getTasksForUser(userId) {
  const snapshot = await firebase
    .database()
    .ref("tasks")
    .orderByChild("userId")
    .equalTo(userId)
    .once("value");

  const data = snapshot.val() || {};
  return Object.values(data);
}

export async function getShortDescriptionTasks(userId, maxLength = 20) {
  const allTasks = await getTasksForUser(userId);
  return allTasks.filter((task) => task.description.length < maxLength);
}

export async function submitUserReview(userId, rating) {
  const reviewRef = firebase.database().ref("reviews").push();
  return reviewRef.set({ userId, rating });
}

export async function getTopUserRatings(limit = 5) {
  const snapshot = await firebase.database().ref("reviews").once("value");
  const data = snapshot.val() || {};
  const userRatings = {};

  Object.values(data).forEach(({ userId, rating }) => {
    if (!userRatings[userId]) userRatings[userId] = [];
    userRatings[userId].push(rating);
  });

  return Object.entries(userRatings)
    .map(([userId, ratings]) => ({
      userId,
      avgRating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
    }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, limit);
}

export async function getTaskStats(userId) {
  const allTasks = await getTasksForUser(userId);
  const completed = allTasks.filter((t) => t.completed).length;
  return {
    total: allTasks.length,
    completed,
  };
}
